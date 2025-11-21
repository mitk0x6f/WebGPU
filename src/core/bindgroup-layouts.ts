// core/bindgroup-layouts.ts

export class BindGroupLayouts
{
    public frame!: GPUBindGroupLayout;
    public scene!: GPUBindGroupLayout;
    public model!: GPUBindGroupLayout;
    public material!: GPUBindGroupLayout;

    initialize(device: GPUDevice): void
    {
        this.frame = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform" }
                }
            ]
        });

        this.scene = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0, // cameraViewProjection
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform" }
                },
                {
                    binding: 1, // cubemap (skybox) sampler
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: "filtering" }
                },
                {
                    binding: 2, // cubemap (skybox) texture
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: "float", viewDimension: "cube" }
                }
            ]
        });

        this.model = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: "uniform" }
                }
            ]
        });

        this.material = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0, // shared sampler for all material textures
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: "filtering" }
                },
                {
                    binding: 1, // base color / albedo
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: "float" }
                },
                {
                    binding: 2, // normal map (tangent-space)
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: "float" }
                },
                {
                    binding: 3, // displacement / height map (read in vertex shader)
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    texture: { sampleType: "float" }
                },
                {
                    binding: 4, // occlusion
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: "float" }
                },
                {
                    binding: 5, // roughness map
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: "float" }
                },
                {
                    binding: 6, // per-material small uniform (uvScaleX, uvScaleY, roughnessFactor, dispScale)
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: "uniform" }
                }
            ]
        });
    }
}