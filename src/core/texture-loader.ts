// core/texture-loader.ts

export async function loadCubemapTexture(device: GPUDevice, name: string)
{
    const faces = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
    const bitmaps: ImageBitmap[] = [];

    for (const f of faces)
    {
        const path = `textures/${name}/${f}.jpg`;
        const res = await fetch(path);

        if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);

        const blob = await res.blob();
        const bitmap = await createImageBitmap(blob);

        bitmaps.push(bitmap);
    }

    const w = bitmaps[0].width;
    const h = bitmaps[0].height;

    // Create texture with 6 layers
    const tex = device.createTexture({
        size: [w, h, 6],
        format: 'rgba8unorm',
        dimension: '2d',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });

    // copy each face into layer index
    for (let i = 0; i < 6; ++i)
    {
        device.queue.copyExternalImageToTexture(
            { source: bitmaps[i] },
            { texture: tex, origin: [0, 0, i] },
            [w, h]
        );
    }

    const view = tex.createView({ dimension: 'cube' });
    const sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        mipmapFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge'
    });

    // cleanup bitmaps (optional in browsers)
    bitmaps.forEach(b => b.close && b.close());

    return { texture: tex, view, sampler };
}

export async function loadSingleTexture(device: GPUDevice, url: string, {repeat = true} = {})
{
    const response = await fetch(url);

    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);

    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

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

    // create a sampler. We use repeat for base/normal/displacement tiling usually.
    const sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        mipmapFilter: 'linear',
        addressModeU: repeat ? 'repeat' : 'clamp-to-edge',
        addressModeV: repeat ? 'repeat' : 'clamp-to-edge'
    });

    const view = texture.createView({ dimension: '2d' });

    return { texture, view, sampler };
}

/**
 * Load standard material maps from textures/<name>/:
 * color.jpg, displacement.jpg, normal.jpg, occlusion.jpg, roughness.jpg
 * If a map is missing the function will fall back to a default 1x1 white texture.
 */
export async function loadMaterialTextures(device: GPUDevice, name: string)
{
    const basePath = `textures/${name}/`;

    async function safeLoad(filename: string, repeat = true)
    {
        const url = basePath + filename;

        try
        {
            return await loadSingleTexture(device, url, { repeat });
        }
        catch (e)
        {
            // If not found, throw or return null — here return null so engine can use fallback resources
            console.warn(`Material texture missing: ${url} -> using fallback`, e);

            return null;
        }
    }

    const [color, normal, displacement, occlusion, roughness] = await Promise.all([
        safeLoad('color.jpg', true),
        safeLoad('normal.jpg', true),
        safeLoad('displacement.jpg', true),
        safeLoad('occlusion.jpg', true),
        safeLoad('roughness.jpg', true)
    ]);

    return {
        color, // may be null -> fallback will apply
        normal,
        displacement,
        occlusion,
        roughness
    };
}
