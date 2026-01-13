// core/model-loader.ts

import { Mesh as ThreeMesh, Group } from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

import { Mesh, type SubMesh } from '../scene/renderables/mesh';
import type { BindGroupLayouts } from './bindgroup-layouts';
import { FallbackResources } from './fallback-resources';

export async function loadMeshFromFBX(
    device: GPUDevice,
    url: string,
    bindGroupLayouts: BindGroupLayouts,
    fallbackResources: FallbackResources,
    debug: boolean = false
): Promise<Mesh>
{
    if (debug)
    {
        console.error(`[${url}] loadMeshFromFBX called`);
    }

    const loader = new FBXLoader();

    // Intercept URL.createObjectURL to capture blob URLs
    const originalCreateObjectURL = URL.createObjectURL;
    const capturedBlobUrls: string[] = [];

    URL.createObjectURL = (obj: Blob | MediaSource) => {
        const url = originalCreateObjectURL(obj);

        if (debug)
        {
            console.log(`[${url}] Intercepted createObjectURL`);
        }

        capturedBlobUrls.push(url);

        return url;
    };

    let fbxGroup: Group;

    try
    {
        fbxGroup = await loader.loadAsync(url);
    }
    finally
    {
        // Restore original function immediately
        URL.createObjectURL = originalCreateObjectURL;
    }

    if (debug)
    {
        console.log(`[${url}] FBX loaded. Captured ${capturedBlobUrls.length} blob URLs.`);
    }

    // Helper to load image from blob URL
    const loadImageFromBlob = async (blobUrl: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
            img.src = blobUrl;
        });
    };

    // Pre-load captured blobs into images
    const loadedImages: HTMLImageElement[] = [];

    if (capturedBlobUrls.length > 0)
    {
        if (debug)
        {
            console.log(`[${url}] Manually loading images from captured blobs...`);
        }

        try
        {
            for (const blobUrl of capturedBlobUrls)
            {
                const img = await loadImageFromBlob(blobUrl);

                loadedImages.push(img);

                if (debug)
                {
                    console.log(`[${url}] Successfully loaded image from ${blobUrl} (${img.width}x${img.height})`);
                }
            }
        }
        catch (e)
        {
            if (debug)
            {
                console.error(`[${url}] Failed to load image from blob:`, e);
            }
        }
    }

    // Assign loaded images to materials if missing
    // REMOVED INCORRECT HEURISTIC: Do not assign loadedImages[0] blindly.
    // We will inspect the materials later to find the correct blob URL.


    const meshes: ThreeMesh[] = [];

    // Collect all meshes
    fbxGroup.traverse((child) => {
        if ((child as ThreeMesh).isMesh)
        {
            if (debug)
            {
                console.log(`[${url}] Found mesh: ${child.name} (Type: ${child.type})`);
            }

            meshes.push(child as ThreeMesh);
        }
    });

    if (meshes.length === 0) throw new Error(`No mesh found in FBX: ${url}`);

    // Merge meshes into one
    // We need to combine:
    // 1. Vertex Data (Position, Normal, UV)
    // 2. Indices (offset by vertex count)
    // 3. Materials (collect unique materials or just list them)
    // 4. SubMeshes (one per original mesh)

    let totalVertexCount = 0;
    let totalIndexCount = 0;

    for (const mesh of meshes)
    {
        // if (_debug)
        // {
        //     console.log(`Counting vertices for ${mesh.name}`);
        // }

        totalVertexCount += mesh.geometry.attributes.position.count;

        if (mesh.geometry.index)
        {
            totalIndexCount += mesh.geometry.index.count;
        }
        else
        {
            totalIndexCount += mesh.geometry.attributes.position.count;
        }
    }

    const stride = 8; // 3 pos + 3 normal + 2 uv
    const combinedVertexData = new Float32Array(totalVertexCount * stride);

    // Use Uint32 if total vertices > 65535
    let combinedIndexData: Uint16Array | Uint32Array;

    if (totalVertexCount > 65535)
    {
        combinedIndexData = new Uint32Array(totalIndexCount);
    }
    else
    {
        combinedIndexData = new Uint16Array(totalIndexCount);
    }

    const subMeshes: SubMesh[] = [];
    const materialBindGroups: GPUBindGroup[] = [];

    // Cache loaded textures to avoid duplicates
    const textureCache = new Map<string, { view: GPUTextureView, sampler: GPUSampler }>();

    let vertexOffset = 0;
    let indexOffset = 0;
    let materialIndexOffset = 0;

    for (const mesh of meshes)
    {

        const geometry = mesh.geometry;

        // Ensure normals
        if (!geometry.attributes.normal)
        {
            geometry.computeVertexNormals();
        }

        const positions = geometry.attributes.position;
        const normals = geometry.attributes.normal;
        const uvs = geometry.attributes.uv;
        const count = positions.count;

        // Update world matrix
        mesh.updateMatrixWorld(true);

        const matrixWorld = mesh.matrixWorld;

        // Calculate normal matrix (inverse transpose of upper 3x3 of world matrix)
        // Three.js matrixWorld is column-major
        const elements = matrixWorld.elements;

        // Helper for transforming position
        // We can inline the transformation for performance

        // Copy Vertex Data
        for (let i = 0; i < count; i++)
        {
            const vIdx = vertexOffset + i;

            // Position
            const px = positions.getX(i);
            const py = positions.getY(i);
            const pz = positions.getZ(i);

            // Apply World Matrix
            const e = elements;
            const w = 1 / (e[3] * px + e[7] * py + e[11] * pz + e[15]);

            combinedVertexData[vIdx * stride + 0] = (e[0] * px + e[4] * py + e[8] * pz + e[12]) * w;
            combinedVertexData[vIdx * stride + 1] = (e[1] * px + e[5] * py + e[9] * pz + e[13]) * w;
            combinedVertexData[vIdx * stride + 2] = (e[2] * px + e[6] * py + e[10] * pz + e[14]) * w;

            // Normal
            if (normals)
            {
                const nx = normals.getX(i);
                const ny = normals.getY(i);
                const nz = normals.getZ(i);

                // Transform normal: We need to remove translation and handle scale.
                // For simplicity, let's just rotate it using the upper 3x3.
                // Correct way is inverse-transpose, but let's try simple rotation first.
                // Actually, let's use the normal matrix logic:
                // N' = mat3(M) * N (if uniform scale)

                combinedVertexData[vIdx * stride + 3] = e[0] * nx + e[4] * ny + e[8] * nz;
                combinedVertexData[vIdx * stride + 4] = e[1] * nx + e[5] * ny + e[9] * nz;
                combinedVertexData[vIdx * stride + 5] = e[2] * nx + e[6] * ny + e[10] * nz;

                // Normalize
                const len = Math.sqrt(
                    combinedVertexData[vIdx * stride + 3] ** 2 +
                    combinedVertexData[vIdx * stride + 4] ** 2 +
                    combinedVertexData[vIdx * stride + 5] ** 2
                );

                if (len > 0)
                {
                    combinedVertexData[vIdx * stride + 3] /= len;
                    combinedVertexData[vIdx * stride + 4] /= len;
                    combinedVertexData[vIdx * stride + 5] /= len;
                }
            }
            else
            {
                combinedVertexData[vIdx * stride + 3] = 0;
                combinedVertexData[vIdx * stride + 4] = 1;
                combinedVertexData[vIdx * stride + 5] = 0;
            }

            // UV
            if (uvs)
            {
                if (debug && i < 5)
                {
                    console.log(`  UV[${i}]:`, uvs.getX(i), uvs.getY(i));
                }

                combinedVertexData[vIdx * stride + 6] = uvs.getX(i);
                combinedVertexData[vIdx * stride + 7] = uvs.getY(i);
            }
            else
            {
                if (debug && i === 0)
                {
                    console.warn('  No UVs found for mesh!');
                }

                combinedVertexData[vIdx * stride + 6] = 0;
                combinedVertexData[vIdx * stride + 7] = 0;
            }
        }

        // Copy Indices
        let currentMeshIndexCount = 0;

        if (geometry.index)
        {
            const indices = geometry.index.array;

            currentMeshIndexCount = geometry.index.count;

            for (let i = 0; i < currentMeshIndexCount; i++)
            {
                combinedIndexData[indexOffset + i] = vertexOffset + indices[i];
            }
        }
        else
        {
            currentMeshIndexCount = count;

            for (let i = 0; i < currentMeshIndexCount; i++)
            {
                combinedIndexData[indexOffset + i] = vertexOffset + i;
            }
        }

        // Process Materials and SubMeshes
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        // If the mesh has groups, it means it has multiple materials applied to different parts of the geometry
        const groups = geometry.groups && geometry.groups.length > 0 ? geometry.groups : [{ start: 0, count: currentMeshIndexCount, materialIndex: 0 }];

        for (const group of groups)
        {
            const matIndex = group.materialIndex ?? 0;
            const threeMat = materials[matIndex] as any;

            if (!threeMat)
            {
                if (debug)
                {
                    console.warn(`[${url}] Material not found for group index ${matIndex} in mesh ${mesh.name}`);
                }

                continue;
            }

            let textureView = fallbackResources.defaultTextureView;
            let sampler = fallbackResources.defaultSampler;

            if (debug)
            {
                // console.log(`Processing Material: ${threeMat.name} (Group: start=${group.start}, count=${group.count})`, threeMat);

                if (threeMat.map)
                {
                    console.log(`  Map details for ${threeMat.name}:`, {
                        image: threeMat.map.image,
                        source: threeMat.map.source,
                        userData: threeMat.map.userData,
                        name: threeMat.map.name,
                        uuid: threeMat.map.uuid
                    });

                    if (threeMat.map.source && threeMat.map.source.data)
                    {
                        console.log(`  Source Data:`, threeMat.map.source.data);
                    }
                }
            }

            let image: any = null;

            // Helper to find image data
            let foundImage = threeMat.map ? threeMat.map.image : null;

            if (!foundImage && threeMat.map && threeMat.map.source && threeMat.map.source.data)
            {
                foundImage = threeMat.map.source.data;
            }

            // Check mipmaps if still not found (e.g. CompressedTexture or DataTexture)
            if (!foundImage && threeMat.map && threeMat.map.mipmaps && threeMat.map.mipmaps.length > 0)
            {
                foundImage = threeMat.map.mipmaps[0];
            }

            if (foundImage)
            {
                image = foundImage;

                // Use UUID as cache key, or fallback to src, or random string
                const cacheKey = threeMat.map.uuid || image.src || Math.random().toString();

                if (textureCache.has(cacheKey))
                {
                    const cached = textureCache.get(cacheKey)!;

                    textureView = cached.view;
                    sampler = cached.sampler;
                }
                else
                {
                    try
                    {
                        let bitmap: ImageBitmap;

                        // Handle different image source types
                        if (debug)
                        {
                            console.log(`  [${url}] Starting createImageBitmap for ${threeMat.name}...`);
                        }

                        if (image instanceof ImageBitmap)
                        {
                            bitmap = image;
                        }
                        else if (image.data && image.width && image.height)
                        {
                            // Raw data (ImageData-like or object with data/width/height)
                            // Create ImageData from it
                            const imageData = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);

                            bitmap = await createImageBitmap(imageData, { imageOrientation: 'flipY' });
                        }
                        else
                        {
                            // HTMLImageElement, SVGImageElement, etc.
                            bitmap = await createImageBitmap(image, { imageOrientation: 'flipY' });
                        }

                        if (debug)
                        {
                            console.log(`  [${url}] Finished createImageBitmap for ${threeMat.name}`);
                        }

                        const texture = device.createTexture({
                            size: [bitmap.width, bitmap.height, 1],
                            format: 'rgba8unorm',
                            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
                        });

                        device.queue.copyExternalImageToTexture(
                            { source: bitmap },
                            { texture },
                            [bitmap.width, bitmap.height]
                        );

                        const view = texture.createView();

                        const s = device.createSampler({
                            magFilter: 'linear',
                            minFilter: 'linear',
                            mipmapFilter: 'linear',
                            addressModeU: 'repeat',
                            addressModeV: 'repeat'
                        });

                        textureView = view;
                        sampler = s;

                        textureCache.set(cacheKey, { view, sampler });

                        if (debug)
                        {
                            console.log(`  Loaded texture: ${cacheKey}`);
                        }
                    }
                    catch (e)
                    {
                        if (debug)
                        {
                            console.warn(`  Failed to load texture from material:`, e);
                        }
                    }
                }
            }
            else if (threeMat.map)
            {
                if (debug)
                {
                    console.warn('  Map exists but NO IMAGE DATA found. Using Checkerboard Fallback.');
                }

                // Create a debug checkerboard texture to indicate missing data
                const size = 64;
                const checkerboard = new Uint8Array(size * size * 4);

                for (let y = 0; y < size; y++)
                {
                    for (let x = 0; x < size; x++)
                    {
                        const isWhite = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
                        const idx = (y * size + x) * 4;

                        checkerboard[idx] = isWhite ? 255 : 0;     // R
                        checkerboard[idx + 1] = isWhite ? 0 : 255; // G
                        checkerboard[idx + 2] = 0;                 // B
                        checkerboard[idx + 3] = 255;               // A
                    }
                }

                const texture = device.createTexture({
                    size: [size, size, 1],
                    format: 'rgba8unorm',
                    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
                });

                device.queue.writeTexture(
                    { texture },
                    checkerboard,
                    { bytesPerRow: size * 4 },
                    [size, size]
                );

                textureView = texture.createView();

                const s = device.createSampler({
                    magFilter: 'nearest',
                    minFilter: 'nearest',
                    mipmapFilter: 'nearest',
                    addressModeU: 'repeat',
                    addressModeV: 'repeat'
                });
                sampler = s;
            }


            // Fallback to color if texture failed or didn't exist
            if (textureView === fallbackResources.defaultTextureView)
            {
                if (debug)
                {
                    console.log('  Using Color Fallback');
                }

                let color = threeMat.color;

                if (color)
                {
                    const r = Math.floor(color.r * 255);
                    const g = Math.floor(color.g * 255);
                    const b = Math.floor(color.b * 255);

                    const texture = device.createTexture({
                        size: [1, 1, 1],
                        format: 'rgba8unorm',
                        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
                    });

                    device.queue.writeTexture(
                        { texture },
                        new Uint8Array([r, g, b, 255]),
                        { bytesPerRow: 4 },
                        [1, 1]
                    );

                    textureView = texture.createView();
                }
            }

            const bindGroup = device.createBindGroup({
                layout: bindGroupLayouts.material,
                entries: [
                    { binding: 0, resource: sampler },
                    { binding: 1, resource: textureView },
                    { binding: 2, resource: fallbackResources.defaultTextureView },
                    { binding: 3, resource: fallbackResources.defaultTextureView },
                    { binding: 4, resource: fallbackResources.defaultTextureView },
                    { binding: 5, resource: fallbackResources.defaultTextureView },
                    { binding: 6, resource: { buffer: fallbackResources.defaultMaterialUniformBuffer } }
                ]
            });

            materialBindGroups.push(bindGroup);

            // Add SubMesh
            subMeshes.push({
                start: indexOffset + group.start,
                count: group.count,
                materialIndex: materialIndexOffset
            });

            materialIndexOffset++;
        }

        vertexOffset += count;
        indexOffset += currentMeshIndexCount;
    }

    const finalMesh = new Mesh(device, bindGroupLayouts, combinedVertexData, combinedIndexData, subMeshes);

    finalMesh.materialBindGroups = materialBindGroups;

    if (debug)
    {
        console.log(`[${url}] loadMeshFromFBX completed`);
    }

    return finalMesh;
}