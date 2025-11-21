import { ShaderManager } from "../rendering/shader-manager";
import type { PipelineDescriptor } from "./pipeline-descriptor";

export class PipelineManager
{
    private _cache: Map<string, GPURenderPipeline> = new Map();

    async getOrCreatePipeline(descriptor: PipelineDescriptor, device: GPUDevice): Promise<GPURenderPipeline>
    {
        const cacheKey = this._generateKey(descriptor);

        if (this._cache.has(cacheKey)) return this._cache.get(cacheKey)!;

        const [vertCode, fragCode] = await Promise.all([
            ShaderManager.load(descriptor.vertexShaderUrl),
            ShaderManager.load(descriptor.fragmentShaderUrl),
        ]);

        const vertexModule = device.createShaderModule({ code: vertCode });
        const fragmentModule = device.createShaderModule({ code: fragCode });

        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: descriptor.bindGroupLayouts
        });

        const pipeline = device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: vertexModule,
                entryPoint: "main",
                buffers: [descriptor.vertexLayout]
            },
            fragment: {
                module: fragmentModule,
                entryPoint: "main",
                targets: [{
                    format: descriptor.colorFormat,
                    blend: descriptor.translucent ? {
                        color: {
                            srcFactor: 'src-alpha',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add'
                        },
                        alpha: {
                            srcFactor: 'one',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add'
                        }
                    } : undefined,
                    writeMask: GPUColorWrite.ALL
                }]
            },
            primitive: {
                topology: 'triangle-list',
                frontFace: 'ccw',
                cullMode: 'back'
            },
            depthStencil: {
                format: 'depth24plus',
                depthWriteEnabled: descriptor.translucent ? false : true,
                depthCompare: 'less'
            }
        });

        this._cache.set(cacheKey, pipeline);

        return pipeline;
    }

    private _generateKey(desc: PipelineDescriptor): string
    {
        return [
            desc.vertexShaderUrl,
            desc.fragmentShaderUrl,
            desc.colorFormat
        ].join('|');
    }
}