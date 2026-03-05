// rendering/render-pass-manager.ts

import { vec3 } from 'gl-matrix';

import { BindGroupIndex } from '../core/bindgroup-indices';
import { BindGroupLayouts } from '../core/bindgroup-layouts';
import type { BufferManager } from '../core/buffer-manager';
import { FallbackResources } from '../core/fallback-resources';
import { BaseCamera } from "../scene/camera/base-camera";
import { Mesh } from '../scene/renderables/mesh';
import { Scene } from '../scene/scene';

export class RenderPassManager
{
    private depthTextureView!: GPUTextureView;
    private frameBindGroup!: GPUBindGroup;
    private reflectionTextureView!: GPUTextureView;

    // Cached objects for reflection rendering to avoid per-frame allocations
    private readonly _originalPos = vec3.create();
    private readonly _reflectedPos = vec3.create();

    get reflectionView(): GPUTextureView
    {
        return this.reflectionTextureView;
    }

    initialize(
        device: GPUDevice,
        context: GPUCanvasContext,
        layouts: BindGroupLayouts,
        buffers: BufferManager,
        fallbacks: FallbackResources,
        presentationFormat: GPUTextureFormat
    )
    {
        const depthTexture = device.createTexture({
            size: [context.canvas.width, context.canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });

        this.depthTextureView = depthTexture.createView();

        const reflectionTexture = device.createTexture({
            size: [context.canvas.width, context.canvas.height], // Full resolution for now
            format: presentationFormat, // Use same format as screen to reuse pipelines
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        this.reflectionTextureView = reflectionTexture.createView();

        this.frameBindGroup = device.createBindGroup({
            layout: layouts.frame,
            entries: [
                { binding: 0, resource: { buffer: buffers.frameBuffer } }
            ]
        });

        // TODO: Try to remove this line. Is it needed? We already call it in renderer.ts -> initialize()
        fallbacks.createMaterialBindGroup(device, layouts.material);
    }

    resize(device: GPUDevice, width: number, height: number, presentationFormat: GPUTextureFormat): void
    {
        // Destroy old texture if needed (optional, GC handles it usually)
        // this.depthTextureView = null!;

        const depthTexture = device.createTexture({
            size: [width, height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });

        this.depthTextureView = depthTexture.createView();

        const reflectionTexture = device.createTexture({
            size: [width, height],
            format: presentationFormat,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        this.reflectionTextureView = reflectionTexture.createView();
    }

    renderReflection(
        scene: Scene,
        camera: BaseCamera,
        device: GPUDevice
    ): void
    {
        // 1. Save camera state
        vec3.copy(this._originalPos, camera.position);
        const originalPitch = camera.pitch;
        const originalYaw = camera.yaw;

        // 2. Find water plane height
        // Water quad vertices are at y=-0.5, so if water is at position (0,0,0), plane is at y=-0.5
        const waterMesh = scene.meshes.find(m => m.name === 'water');
        const waterPlaneY = waterMesh ? waterMesh.position[1] - 0.5 : -0.5;

        // 3. Mirror camera across water plane
        // For a plane at height h: reflected_y = 2*h - original_y
        const distanceAbovePlane = this._originalPos[1] - waterPlaneY;
        const mirroredY = waterPlaneY - distanceAbovePlane;

        vec3.set(this._reflectedPos, this._originalPos[0], mirroredY, this._originalPos[2]);
        camera.position = this._reflectedPos;
        camera.pitch = -originalPitch;

        camera.updateMatrices();

        // Update skybox position for reflection camera
        if (scene.skybox)
        {
            scene.skybox.position.set(camera.position);
            scene.skybox.updateModelMatrix(device);
        }

        // Pass 1: Render Skybox (No Clipping)
        if (scene.skybox?.visible && scene.skybox.pipeline)
        {
            const encoderSkybox = device.createCommandEncoder();
            const passSkybox = encoderSkybox.beginRenderPass({
                colorAttachments: [
                    {
                        view: this.reflectionTextureView,
                        loadOp: 'clear',
                        storeOp: 'store',
                        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1 } // Black
                    }
                ],
                depthStencilAttachment: {
                    view: this.depthTextureView,
                    depthClearValue: 1,
                    depthLoadOp: 'clear',
                    depthStoreOp: 'store'
                }
            });

            passSkybox.setBindGroup(BindGroupIndex.Frame, this.frameBindGroup);
            passSkybox.setBindGroup(BindGroupIndex.Scene, camera.reflectionSceneBindGroup); // Uses camera WITHOUT clip plane (yet)

            passSkybox.setPipeline(scene.skybox.pipeline);
            scene.skybox.bind(passSkybox);
            passSkybox.drawIndexed(scene.skybox.indexCount);
            passSkybox.end();

            device.queue.submit([encoderSkybox.finish()]);
        }

        // Pass 2: Render all meshes (simple mirror reflection)
        const encoderMeshes = device.createCommandEncoder();
        const passMeshes = encoderMeshes.beginRenderPass({
            colorAttachments: [
                {
                    view: this.reflectionTextureView,
                    loadOp: scene.skybox?.visible ? 'load' : 'clear',
                    storeOp: 'store',
                    clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1 }
                }
            ],
            depthStencilAttachment: {
                view: this.depthTextureView,
                depthLoadOp: scene.skybox?.visible ? 'load' : 'clear',
                depthClearValue: 1,
                depthStoreOp: 'store'
            }
        });

        passMeshes.setBindGroup(BindGroupIndex.Frame, this.frameBindGroup);
        passMeshes.setBindGroup(BindGroupIndex.Scene, camera.reflectionSceneBindGroup);

        // Render all meshes except water (simple mirror)
        for (const mesh of scene.meshes)
        {
            if (!mesh.visible || !mesh.pipeline || mesh.name === 'water') continue;

            passMeshes.setPipeline(mesh.pipeline);

            mesh.bind(passMeshes);

            if (mesh.subMeshes.length > 0)
            {
                for (const subMesh of mesh.subMeshes)
                {
                    const bindGroup = mesh.materialBindGroups[subMesh.materialIndex] || mesh.materialBindGroups[0];
                    passMeshes.setBindGroup(BindGroupIndex.Material, bindGroup);
                    passMeshes.drawIndexed(subMesh.count, 1, subMesh.start, 0, 0);
                }
            }
            else
            {
                passMeshes.setBindGroup(BindGroupIndex.Material, mesh.materialBindGroups[0]);
                passMeshes.drawIndexed(mesh.indexCount);
            }
        }

        passMeshes.end();

        device.queue.submit([encoderMeshes.finish()]);

        // 4. Restore camera state
        camera.position = this._originalPos;
        camera.pitch = originalPitch;
        camera.yaw = originalYaw;
        camera.updateMatrices();

        // Restore skybox position to original camera position
        if (scene.skybox)
        {
            scene.skybox.position.set(this._originalPos);
            scene.skybox.updateModelMatrix(device);
        }
    }

    execute(
        scene: Scene,
        camera: BaseCamera,
        device: GPUDevice,
        context: GPUCanvasContext
    ): void
    {
        const encoder = device.createCommandEncoder();
        const view = context.getCurrentTexture().createView();

        const pass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view,
                    loadOp: 'clear',
                    storeOp: 'store',
                    clearValue: { r: 0.1, g: 0.0, b: 0.2, a: 1 }
                }
            ],
            depthStencilAttachment: {
                view: this.depthTextureView,
                depthClearValue: 1,
                depthLoadOp: 'clear',
                depthStoreOp: 'store'
            }
        });

        // Bind per-frame / per-scene groups
        pass.setBindGroup(BindGroupIndex.Frame, this.frameBindGroup);
        pass.setBindGroup(BindGroupIndex.Scene, camera.sceneBindGroup);

        if (scene.skybox?.visible && scene.skybox.pipeline)
        {
            pass.setPipeline(scene.skybox.pipeline);

            scene.skybox.bind(pass);

            pass.drawIndexed(scene.skybox.indexCount);
        }

        const opaqueMeshes: Mesh[] = [];
        const translucentMeshes: Mesh[] = [];

        for (const mesh of scene.meshes)
        {
            if (!mesh.visible || !mesh.pipeline) continue;

            if (mesh.translucent)
            {
                translucentMeshes.push(mesh);
            }
            else
            {
                opaqueMeshes.push(mesh);
            }
        }

        // Draw opaque meshes first
        for (const mesh of opaqueMeshes)
        {
            if (!mesh.pipeline) throw new Error('Unexpected: Pipeline not set for mesh');

            pass.setPipeline(mesh.pipeline);

            mesh.bind(pass);

            if (mesh.subMeshes.length > 0)
            {
                for (const subMesh of mesh.subMeshes)
                {
                    const bindGroup = mesh.materialBindGroups[subMesh.materialIndex] || mesh.materialBindGroups[0];
                    pass.setBindGroup(BindGroupIndex.Material, bindGroup);
                    pass.drawIndexed(subMesh.count, 1, subMesh.start, 0, 0);
                }
            }
            else
            {
                pass.setBindGroup(BindGroupIndex.Material, mesh.materialBindGroups[0]);
                pass.drawIndexed(mesh.indexCount);
            }
        }

        // Sort translucent meshes from back to front by distance to camera
        translucentMeshes.sort((meshA, meshB) =>
        {
            // Using squaredDistance() instead of distance() because it's faster and we don't need the actual distance
            const distanceA = vec3.squaredDistance(camera.position, meshA.position);
            const distanceB = vec3.squaredDistance(camera.position, meshB.position);

            return distanceB - distanceA;
        });

        // Draw translucent meshes
        for (const mesh of translucentMeshes)
        {
            if (!mesh.pipeline) throw new Error('Unexpected: Pipeline not set for mesh');

            pass.setPipeline(mesh.pipeline);

            mesh.bind(pass);

            if (mesh.subMeshes.length > 0)
            {
                for (const subMesh of mesh.subMeshes)
                {
                    const bindGroup = mesh.materialBindGroups[subMesh.materialIndex] || mesh.materialBindGroups[0];
                    pass.setBindGroup(BindGroupIndex.Material, bindGroup);
                    pass.drawIndexed(subMesh.count, 1, subMesh.start, 0, 0);
                }
            }
            else
            {
                pass.setBindGroup(BindGroupIndex.Material, mesh.materialBindGroups[0]);
                pass.drawIndexed(mesh.indexCount);
            }
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
    }
}