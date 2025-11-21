import type { PipelineDescriptor } from './pipeline-descriptor';
import type { PipelineManager } from './pipeline-manager';

export class Material
{
    private _pipeline?: GPURenderPipeline;

    public descriptor: PipelineDescriptor;

    constructor(descriptor: PipelineDescriptor)
    {
        this.descriptor = descriptor;
    }

    async initialize(device: GPUDevice, pipelineManager: PipelineManager)
    {
        this._pipeline = await pipelineManager.getOrCreatePipeline(this.descriptor, device);
    }

    get pipeline(): GPURenderPipeline
    {
        if (!this._pipeline) throw new Error("Material not initialized with a pipeline.");

        return this._pipeline;
    }
}