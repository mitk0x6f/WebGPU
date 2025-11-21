// core/fallback-resources.ts

import { vec2 } from 'gl-matrix';

export class FallbackResources
{
    public defaultSampler!: GPUSampler;
    public defaultTextureView!: GPUTextureView;
    public defaultTextureCubemapView!: GPUTextureView;
    public defaultMaterialUniformBuffer!: GPUBuffer;
    public materialBindGroup!: GPUBindGroup;

    initialize(device: GPUDevice): void
    {
        const defaultTexture = device.createTexture({
            size: vec2.fromValues(1, 1),
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        });

        const whitePixel = new Uint8Array([255, 255, 255, 255]);

        device.queue.writeTexture(
            { texture: defaultTexture },
            whitePixel,
            { bytesPerRow: 4 },
            { width: 1, height: 1 }
        );

        this.defaultTextureView = defaultTexture.createView({ dimension: '2d' });

        // Sampler with repeat (for tiling)
        this.defaultSampler = device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            mipmapFilter: 'linear',
            addressModeU: 'repeat',
            addressModeV: 'repeat'
        });

        // Default cubemap: create a 1x1x6 texture and fill all faces with white
        const defaultTextureCubemap = device.createTexture({
            size: [1, 1, 6],
            format: 'rgba8unorm',
            dimension: '2d',
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING
        });

        // Write same white pixel on each layer
        for (let layer = 0; layer < 6; ++layer)
        {
            // Create an ImageBitmap for 1x1 white pixel is overkill
            // => use writeTexture with instead
            device.queue.writeTexture(
                { texture: defaultTextureCubemap, origin: [0, 0, layer] },
                whitePixel,
                { bytesPerRow: 4 },
                { width: 1, height: 1 }
            );
        }

        this.defaultTextureCubemapView = defaultTextureCubemap.createView({ dimension: 'cube' });

        // Default material uniform buffer (vec4 = 16 bytes)
        // uvScale.x, uvScale.y, roughnessScale, padding
        this.defaultMaterialUniformBuffer = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // Could be used without .buffer, but this way is safer
        // We can create a Float32Array here, because this function is only called once on scene creation (startup)
        // new Float32Array([texture scale x, texture scale y, roughness scale, padding])
        device.queue.writeBuffer(this.defaultMaterialUniformBuffer, 0, new Float32Array([1.0, 1.0, 1.0, 0.0]).buffer);
    }

    createMaterialBindGroup(device: GPUDevice, layout: GPUBindGroupLayout): void
    {
        this.materialBindGroup = device.createBindGroup({
            layout,
            entries: [
                { binding: 0, resource: this.defaultSampler },
                { binding: 1, resource: this.defaultTextureView }, // baseColor
                { binding: 2, resource: this.defaultTextureView }, // normal
                { binding: 3, resource: this.defaultTextureView }, // displacement
                { binding: 4, resource: this.defaultTextureView }, // occlusion
                { binding: 5, resource: this.defaultTextureView }, // roughness
                { binding: 6, resource: { buffer: this.defaultMaterialUniformBuffer } }
            ]
        });
    }
}