// rendering/render-pass-manager.ts

import { vec3 } from 'gl-matrix';
import { BindGroupLayouts } from '../core/bindgroup-layouts';
import { FallbackResources } from '../core/fallback-resources';
import { BindGroupIndex } from '../core/bindgroup-indices';
import type { BufferManager } from '../core/buffer-manager';
import { Mesh } from '../scene/renderables/mesh';
import { Camera } from '../scene/camera';
import { Scene } from '../scene/scene';

export class RenderPassManager
{
    private depthTextureView!: GPUTextureView;
    private frameBindGroup!: GPUBindGroup;

    initialize(
        device: GPUDevice,
        context: GPUCanvasContext,
        layouts: BindGroupLayouts,
        buffers: BufferManager,
        fallbacks: FallbackResources
    )
    {
        const depthTexture = device.createTexture({
            size: [context.canvas.width, context.canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });

        this.depthTextureView = depthTexture.createView();

        this.frameBindGroup = device.createBindGroup({
            layout: layouts.frame,
            entries: [
                { binding: 0, resource: { buffer: buffers.frameBuffer } }
            ]
        });

        // TODO: Try to remove this line. Is it needed? We already call it in renderer.ts -> initialize()
        fallbacks.createMaterialBindGroup(device, layouts.material);
    }

    resize(device: GPUDevice, width: number, height: number): void
    {
        // Destroy old texture if needed (optional, GC handles it usually)
        // this.depthTextureView = null!;

        const depthTexture = device.createTexture({
            size: [width, height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });

        this.depthTextureView = depthTexture.createView();
    }

    execute(
        scene: Scene,
        camera: Camera,
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

            if (mesh instanceof Mesh)
            {
                pass.setBindGroup(BindGroupIndex.Material, mesh.materialBindGroup);
            }

            pass.drawIndexed(mesh.indexCount);
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

            if (mesh instanceof Mesh)
            {
                pass.setBindGroup(BindGroupIndex.Material, mesh.materialBindGroup);
            }

            pass.drawIndexed(mesh.indexCount);
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
    }
}