// scene/scene.ts

import type { BindGroupLayouts } from '../core/bindgroup-layouts';
import type { FallbackResources } from '../core/fallback-resources';
import { Mesh } from './renderables/mesh';
import { Skybox } from './renderables/skybox';
import type { Material } from './material';

export class Scene
{
    private _meshes: Mesh[] = [];
    private _skybox: Skybox | null = null;
    private readonly _device: GPUDevice;
    private readonly _bindGroupLayouts: BindGroupLayouts;
    private readonly _fallbackResources: FallbackResources;

    constructor(
        device: GPUDevice,
        bindGroupLayouts: BindGroupLayouts,
        fallbackResources: FallbackResources
    )
    {
        this._device = device;
        this._bindGroupLayouts = bindGroupLayouts;
        this._fallbackResources = fallbackResources;
    }

    get meshes(): Mesh[]
    {
        return this._meshes;
    }

    get skybox(): Skybox | null
    {
        return this._skybox;
    }

    get device(): GPUDevice
    {
        return this._device;
    }

    createSkybox(material: Material): Skybox
    {
        const vertices = new Float32Array([
            // Positions          // Normals          // UVs

            // Front face
            -0.5, -0.5,  0.5,     0.0,  0.0,  0.5,    0.0, 0.0,  // bottom-left
             0.5, -0.5,  0.5,     0.0,  0.0,  0.5,    0.5, 0.0,  // bottom-right
             0.5,  0.5,  0.5,     0.0,  0.0,  0.5,    0.5, 0.5,  // top-right
            -0.5,  0.5,  0.5,     0.0,  0.0,  0.5,    0.0, 0.5,  // top-left

            // Back face
            -0.5, -0.5, -0.5,     0.0,  0.0, -0.5,    0.5, 0.0,  // bottom-right
             0.5, -0.5, -0.5,     0.0,  0.0, -0.5,    0.0, 0.0,  // bottom-left
             0.5,  0.5, -0.5,     0.0,  0.0, -0.5,    0.0, 0.5,  // top-left
            -0.5,  0.5, -0.5,     0.0,  0.0, -0.5,    0.5, 0.5,  // top-right

            // Top face
            -0.5,  0.5, -0.5,     0.0,  0.5,  0.0,    0.0, 0.5,  // top-left
             0.5,  0.5, -0.5,     0.0,  0.5,  0.0,    0.5, 0.5,  // top-right
             0.5,  0.5,  0.5,     0.0,  0.5,  0.0,    0.5, 0.0,  // bottom-right
            -0.5,  0.5,  0.5,     0.0,  0.5,  0.0,    0.0, 0.0,  // bottom-left

            // Bottom face
            -0.5, -0.5, -0.5,     0.0, -0.5,  0.0,    0.0, 0.0,  // top-right
             0.5, -0.5, -0.5,     0.0, -0.5,  0.0,    0.5, 0.0,  // top-left
             0.5, -0.5,  0.5,     0.0, -0.5,  0.0,    0.5, 0.5,  // bottom-left
            -0.5, -0.5,  0.5,     0.0, -0.5,  0.0,    0.0, 0.5,  // bottom-right

            // Right face
             0.5, -0.5, -0.5,     0.5,  0.0,  0.0,    0.0, 0.0,  // bottom-right
             0.5, -0.5,  0.5,     0.5,  0.0,  0.0,    0.5, 0.0,  // bottom-left
             0.5,  0.5,  0.5,     0.5,  0.0,  0.0,    0.5, 0.5,  // top-left
             0.5,  0.5, -0.5,     0.5,  0.0,  0.0,    0.0, 0.5,  // top-right

            // Left face
            -0.5, -0.5, -0.5,    -0.5,  0.0,  0.0,    0.5, 0.0,  // bottom-left
            -0.5, -0.5,  0.5,    -0.5,  0.0,  0.0,    0.0, 0.0,  // bottom-right
            -0.5,  0.5,  0.5,    -0.5,  0.0,  0.0,    0.0, 0.5,  // top-right
            -0.5,  0.5, -0.5,    -0.5,  0.0,  0.0,    0.5, 0.5   // top-left
        ]);

        const indices = new Uint16Array([
            0,  2,  1,  0,  3,  2,   // Front face
            4,  5,  6,  4,  6,  7,   // Back face
            8,  9, 10,  8,  10, 11,  // Top face
            12, 14, 13, 12, 15, 14,  // Bottom face
            16, 17, 18, 16, 18, 19,  // Right face
            20, 22, 21, 20, 23, 22   // Left face
        ]);

        const skybox = new Skybox(this._device, this._bindGroupLayouts, vertices, indices);

        skybox.setPipeline(material.pipeline);

        skybox.materialBindGroup = this._fallbackResources.materialBindGroup;

        this._skybox = skybox;

        return skybox;
    }

    createQuad(material: Material): Mesh
    {
        const vertices = new Float32Array([
            // Positions         // Normals  // UVs
            -0.5, -0.5,  0.5,    0, 1, 0,    0, 0,
             0.5, -0.5,  0.5,    0, 1, 0,    1, 0,
             0.5, -0.5, -0.5,    0, 1, 0,    1, 1,
            -0.5, -0.5, -0.5,    0, 1, 0,    0, 1
        ]);

        const indices = new Uint16Array([
            0, 1, 2, 0, 2, 3
        ]);

        const mesh = new Mesh(this._device, this._bindGroupLayouts, vertices, indices);

        mesh.setPipeline(material.pipeline);

        mesh.translucent = material.descriptor.translucent ?? false;

        mesh.materialBindGroup = this._fallbackResources.materialBindGroup;

        this._meshes.push(mesh);

        return mesh;
    }

    createCube(material: Material): Mesh
    {
        const vertices = new Float32Array([
            // Positions          // Normals          // UVs

            // Front face
            -0.5, -0.5,  0.5,     0.0,  0.0,  0.5,    0.0, 0.0,  // bottom-left
             0.5, -0.5,  0.5,     0.0,  0.0,  0.5,    0.5, 0.0,  // bottom-right
             0.5,  0.5,  0.5,     0.0,  0.0,  0.5,    0.5, 0.5,  // top-right
            -0.5,  0.5,  0.5,     0.0,  0.0,  0.5,    0.0, 0.5,  // top-left

            // Back face
            -0.5, -0.5, -0.5,     0.0,  0.0, -0.5,    0.5, 0.0,  // bottom-right
             0.5, -0.5, -0.5,     0.0,  0.0, -0.5,    0.0, 0.0,  // bottom-left
             0.5,  0.5, -0.5,     0.0,  0.0, -0.5,    0.0, 0.5,  // top-left
            -0.5,  0.5, -0.5,     0.0,  0.0, -0.5,    0.5, 0.5,  // top-right

            // Top face
            -0.5,  0.5, -0.5,     0.0,  0.5,  0.0,    0.0, 0.5,  // top-left
             0.5,  0.5, -0.5,     0.0,  0.5,  0.0,    0.5, 0.5,  // top-right
             0.5,  0.5,  0.5,     0.0,  0.5,  0.0,    0.5, 0.0,  // bottom-right
            -0.5,  0.5,  0.5,     0.0,  0.5,  0.0,    0.0, 0.0,  // bottom-left

            // Bottom face
            -0.5, -0.5, -0.5,     0.0, -0.5,  0.0,    0.0, 0.0,  // top-right
             0.5, -0.5, -0.5,     0.0, -0.5,  0.0,    0.5, 0.0,  // top-left
             0.5, -0.5,  0.5,     0.0, -0.5,  0.0,    0.5, 0.5,  // bottom-left
            -0.5, -0.5,  0.5,     0.0, -0.5,  0.0,    0.0, 0.5,  // bottom-right

            // Right face
             0.5, -0.5, -0.5,     0.5,  0.0,  0.0,    0.0, 0.0,  // bottom-right
             0.5, -0.5,  0.5,     0.5,  0.0,  0.0,    0.5, 0.0,  // bottom-left
             0.5,  0.5,  0.5,     0.5,  0.0,  0.0,    0.5, 0.5,  // top-left
             0.5,  0.5, -0.5,     0.5,  0.0,  0.0,    0.0, 0.5,  // top-right

            // Left face
            -0.5, -0.5, -0.5,    -0.5,  0.0,  0.0,    0.5, 0.0,  // bottom-left
            -0.5, -0.5,  0.5,    -0.5,  0.0,  0.0,    0.0, 0.0,  // bottom-right
            -0.5,  0.5,  0.5,    -0.5,  0.0,  0.0,    0.0, 0.5,  // top-right
            -0.5,  0.5, -0.5,    -0.5,  0.0,  0.0,    0.5, 0.5   // top-left
        ]);

        const indices = new Uint16Array([
            0,  1,  2,  0,  2,  3,   // Front face
            4,  6,  5,  4,  7,  6,   // Back face
            8,  10, 9,  8,  11, 10,  // Top face
            12, 13, 14, 12, 14, 15,  // Bottom face
            16, 18, 17, 16, 19, 18,  // Right face
            20, 21, 22, 20, 22, 23   // Left face
        ]);

        const mesh = new Mesh(this._device, this._bindGroupLayouts, vertices, indices);

        mesh.setPipeline(material.pipeline);

        mesh.materialBindGroup = this._fallbackResources.materialBindGroup;

        this._meshes.push(mesh);

        return mesh;
    }

    destroy(): void
    {
        for (const mesh of this._meshes)
        {
            mesh.destroy();
        }

        this._meshes = [];

        if (this._skybox)
        {
            this._skybox.destroy();
            this._skybox = null;
        }
    }
}