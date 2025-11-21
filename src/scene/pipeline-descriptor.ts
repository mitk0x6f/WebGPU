// scene/pipeline-descriptor.ts

export interface PipelineDescriptor
{
    vertexShaderUrl: string;
    fragmentShaderUrl: string;
    vertexLayout: GPUVertexBufferLayout;
    bindGroupLayouts: GPUBindGroupLayout[];
    colorFormat: GPUTextureFormat;
    translucent?: boolean;
}