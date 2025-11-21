// scene/bootstrap.ts

import { vertexFormatPositionNormalUV } from '../core/vertex-formats';
import { Camera } from './camera';
import { Material } from './material';
import { loadCubemapTexture, loadMaterialTextures } from '../core/texture-loader';
import { Renderer } from '../rendering/renderer';
import { PipelineManager } from './pipeline-manager';
import { Scene } from './scene';

export async function initializeScene(renderer: Renderer, camera: Camera): Promise<Scene>
{
    camera.position = [0, 1, 7];

    const scene = new Scene(
        renderer.device,
        renderer.bindGroupLayouts,
        renderer.fallbackResources
    );

    const pipelineManager = new PipelineManager();

    // TODO: Move this temporary code somewhere else for better separation of concerns and single responsibility principle?
    // ! FROM HERE

    const material_skybox = new Material({
        vertexShaderUrl: '../shaders/skybox/vert.wgsl',
        fragmentShaderUrl: '../shaders/skybox/frag.wgsl',
        vertexLayout: vertexFormatPositionNormalUV,
        bindGroupLayouts: [
            renderer.bindGroupLayouts.frame,
            renderer.bindGroupLayouts.scene,
            renderer.bindGroupLayouts.model,
            renderer.bindGroupLayouts.material
        ],
        colorFormat: renderer.deviceFormat
    });

    await material_skybox.initialize(renderer.device, pipelineManager);

    const texture_skybox = await loadCubemapTexture(renderer.device, 'skybox');

    // Update camera scene bind group with skybox texture
    camera.sceneBindGroup = renderer.device.createBindGroup({
        layout: renderer.bindGroupLayouts.scene,
        entries: [
            { binding: 0, resource: { buffer: camera.cameraBuffer } },
            { binding: 1, resource: texture_skybox.sampler },
            { binding: 2, resource: texture_skybox.view }
        ]
    })

    const material_water = new Material({
        vertexShaderUrl: '../shaders/water/vert.wgsl',
        fragmentShaderUrl: '../shaders/water/frag.wgsl',
        vertexLayout: vertexFormatPositionNormalUV,
        bindGroupLayouts: [
            renderer.bindGroupLayouts.frame,
            renderer.bindGroupLayouts.scene,
            renderer.bindGroupLayouts.model,
            renderer.bindGroupLayouts.material
        ],
        colorFormat: renderer.deviceFormat,
        translucent: true
    });

    await material_water.initialize(renderer.device, pipelineManager);

    const texture_water = await loadMaterialTextures(renderer.device, 'water');

    const material_water_uniform_buffer = renderer.device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })

    let texture_water_stretch_x = 500.0;
    let texture_water_stretch_y = 500.0;
    const texture_water_roughness_factor = 1.0 // Multiply sampled roughness
    const texture_water_display_scale = 0.05 // How much to displace world-space units

    // Could be used without .buffer, but this way is safer
    // We can create a Float32Array here, because this function is only called once on scene creation (startup)
    renderer.device.queue.writeBuffer(
        material_water_uniform_buffer,
        0,
        new Float32Array([
            texture_water_stretch_x,
            texture_water_stretch_y,
            texture_water_roughness_factor,
            texture_water_display_scale
        ]).buffer);

    const material_cube = new Material({
        vertexShaderUrl: '../shaders/cube/vert.wgsl',
        fragmentShaderUrl: '../shaders/cube/frag.wgsl',
        vertexLayout: vertexFormatPositionNormalUV,
        bindGroupLayouts: [
            renderer.bindGroupLayouts.frame,
            renderer.bindGroupLayouts.scene,
            renderer.bindGroupLayouts.model,
            renderer.bindGroupLayouts.material
        ],
        colorFormat: renderer.deviceFormat
    });

    await material_cube.initialize(renderer.device, pipelineManager);

    // ! TO HERE

    const skybox = scene.createSkybox(material_skybox);
    skybox.scale = Float32Array.from([500, 500, 500]);

    const water = scene.createQuad(material_water);
    // ! AND FROM HERE
    water.materialBindGroup = renderer.device.createBindGroup({
        layout: renderer.bindGroupLayouts.material,
        entries: [
            { binding: 0, resource: texture_water.color?.sampler ?? renderer.fallbackResources.defaultSampler },
            { binding: 1, resource: texture_water.color?.view ?? renderer.fallbackResources.defaultTextureView },
            { binding: 2, resource: texture_water.normal?.view ?? renderer.fallbackResources.defaultTextureView },
            { binding: 3, resource: texture_water.displacement?.view ?? renderer.fallbackResources.defaultTextureView },
            { binding: 4, resource: texture_water.occlusion?.view ?? renderer.fallbackResources.defaultTextureView },
            { binding: 5, resource: texture_water.roughness?.view ?? renderer.fallbackResources.defaultTextureView },
            { binding: 6, resource: { buffer: material_water_uniform_buffer ?? renderer.fallbackResources.defaultMaterialUniformBuffer } }
        ]
    })
    // ! TO HERE
    water.scale = Float32Array.from([texture_water_stretch_x, 1, texture_water_stretch_y]);

    const cube1 = scene.createCube(material_cube);
    cube1.position = Float32Array.from([-2, 0, 0]);

    const cube2 = scene.createCube(material_cube);
    cube2.position = Float32Array.from([0, -0.5, 0]);

    const cube3 = scene.createCube(material_cube);
    cube3.position = Float32Array.from([2, -2, 0]);

    const cube4 = scene.createCube(material_cube);
    cube4.position = Float32Array.from([0, -20, -35]);

    return scene;
}

export function updateScene(scene: Scene, camera: Camera, deltaTime: number): void
{
    for (const mesh of scene.meshes)
    {
        if (!mesh.visible) continue;

        mesh.updateModelMatrix(scene.device);
    }

    if (scene.skybox)
    {
        scene.skybox.position.set(camera.position);
        scene.skybox.updateModelMatrix(scene.device);
    }

    camera.update(deltaTime);
}