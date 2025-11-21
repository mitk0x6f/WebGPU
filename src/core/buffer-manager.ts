// core/buffer-manager.ts

// TODO: Adjust size of buffers

export class BufferManager
{
    public frameBuffer!: GPUBuffer;

    initialize(device: GPUDevice): void
    {
        // ! If we use dynamic uniform buffers with offsets, minimum buffer size is 256
        this.frameBuffer = device.createBuffer({
            size: 80, // viewProj = 64, time = 4, frame = 4, resolution = 8
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }
}