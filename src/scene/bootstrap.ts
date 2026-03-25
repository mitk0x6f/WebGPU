// scene/bootstrap.ts

import { loadMeshFromFBX } from '../core/model-loader';
import { loadCubemapTexture, loadMaterialTextures } from '../core/texture-loader';
import { vertexFormatPositionNormalUV } from '../core/vertex-formats';
import { Renderer } from '../rendering/renderer';
import { BaseCamera } from './camera/base-camera';
import { Character } from './character';
import { Material } from './material';
import { PipelineManager } from './pipeline-manager';
import { Scene } from './scene';

export async function initializeScene(renderer: Renderer, camera: BaseCamera): Promise<{ scene: Scene, character: Character }>
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

    const texture_skybox = await loadCubemapTexture(renderer.device, 'skybox2');

    // Update camera scene bind group with skybox texture
    camera.sceneBindGroup = renderer.device.createBindGroup({
        layout: renderer.bindGroupLayouts.scene,
        entries: [
            { binding: 0, resource: { buffer: camera.cameraBuffer } },
            { binding: 1, resource: texture_skybox.sampler },
            { binding: 2, resource: texture_skybox.view },
            { binding: 3, resource: renderer.reflectionTextureView }
        ]
    });

    // Also update reflection bind group with skybox texture
    camera.reflectionSceneBindGroup = renderer.device.createBindGroup({
        layout: renderer.bindGroupLayouts.scene,
        entries: [
            { binding: 0, resource: { buffer: camera.cameraBuffer } },
            { binding: 1, resource: texture_skybox.sampler },
            { binding: 2, resource: texture_skybox.view },
            { binding: 3, resource: renderer.fallbackResources.defaultTextureView } // Dummy to avoid hazard
        ]
    });


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
        translucent: false // Opaque mirror-like surface
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
    skybox.collisionEnabled = false; // Decorative — non-collidable

    const water = scene.createQuad(material_water);
    water.name = 'water'; // TODO: Make water a separate class, so we can omit Renderable.name
    // ! AND FROM HERE
    water.materialBindGroups = [renderer.device.createBindGroup({
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
    })];
    // ! TO HERE
    water.scale = Float32Array.from([texture_water_stretch_x, 1, texture_water_stretch_y]);

    // Water is a physical walkable surface — collisionEnabled stays true (default).
    // The character walks on it and will fall off the edge when reaching the boundary.

    // ------------------------------------------------------------------
    // Physics world
    // ------------------------------------------------------------------
    // Auto-collision: PhysicsWorld reads each mesh's `localBounds` AABB (computed from
    // vertex data during construction) and derives world-space BoxColliders.
    // No separate invisible collision objects are created.
    // Meshes opt out via `collisionEnabled = false` (skybox, character self-mesh).

    const chunk = 3;

    for (let x = 0; x < chunk; x++)
    {
        for (let y = 0; y < chunk; y++)
        {
            for (let z = 0; z < chunk; z++)
            {
                const cube = scene.createCube(material_cube);

                // Position cubes in a 3×3×3 grid
                const cx = 5 + x - chunk * 0.5 + 0.5;
                const cy = 1.0 + y; // First layer center at 1.0 (half-player-height above water level -0.5)
                const cz = -15 - z - chunk * 0.5 + 0.5;

                cube.position = Float32Array.from([cx, cy, cz]);

                // collisionEnabled stays true (default) — auto-registered below

                // Assign all cubes to a single group
                scene.groupManager.assign(cube, 2);
            }
        }
    }

    // Load Character
    const material_standard = new Material({
        vertexShaderUrl: '../shaders/cube/vert.wgsl', // Reusing cube vertex shader as it provides standard attributes
        fragmentShaderUrl: '../shaders/standard/frag.wgsl',
        vertexLayout: vertexFormatPositionNormalUV,
        bindGroupLayouts: [
            renderer.bindGroupLayouts.frame,
            renderer.bindGroupLayouts.scene,
            renderer.bindGroupLayouts.model,
            renderer.bindGroupLayouts.material
        ],
        colorFormat: renderer.deviceFormat
    });

    await material_standard.initialize(renderer.device, pipelineManager);

    // Load Character
    const characterMesh = await loadMeshFromFBX(renderer.device, 'models/character.fbx', renderer.bindGroupLayouts, renderer.fallbackResources);
    // The character mesh is the player entity itself — it must not collide with its own body.
    characterMesh.collisionEnabled = false;

    scene.addMesh(characterMesh, material_standard);

    const character = new Character(characterMesh);
    // TODO: Find out how is character initial position defined
    character.position[1] = -0.5; // Water level
    character.mesh.scale = Float32Array.from([0.01, 0.01, 0.01]);

    // Assign skybox and water to a single group
    scene.groupManager.assign(skybox, 1);
    scene.groupManager.assign(water, 1);
    // Assign character to group 3
    scene.groupManager.assign(characterMesh, 3);

    // Auto-generate collision shapes from each mesh's vertex geometry.
    // Must be called AFTER all positions and scales are set.
    scene.buildPhysicsWorld();

    return { scene, character };
}

/**
 * Per-frame scene update: uploads model matrices to the GPU.
 * Character position/rotation are driven by Character.update() + physics — NOT here.
 */
export function updateScene(scene: Scene, camera: BaseCamera): void
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
}