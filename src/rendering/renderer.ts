// rendering/renderer.ts

import { Scene } from '../scene/scene';
import { Camera } from '../scene/camera';
import { DeviceManager } from '../core/device-manager';
import { BufferManager } from '../core/buffer-manager';
import { BindGroupLayouts } from '../core/bindgroup-layouts';
import { FallbackResources } from '../core/fallback-resources';
import { RenderPassManager } from './render-pass-manager';

export class Renderer
{
    private readonly _deviceManager: DeviceManager;
    private readonly _renderPassManager: RenderPassManager;

    private _frameData = new Float32Array(4); // ? time, frame, width, height
    private _frameCount = 0;

    public readonly bufferManager: BufferManager;
    public readonly bindGroupLayouts: BindGroupLayouts;
    public readonly fallbackResources: FallbackResources;

    get device(): GPUDevice
    {
        return this._deviceManager.device;
    }

    get deviceFormat(): GPUTextureFormat
    {
        return this._deviceManager.format;
    }

    constructor(canvas: HTMLCanvasElement)
    {
        this._deviceManager = new DeviceManager(canvas);
        this.bufferManager = new BufferManager();
        this.bindGroupLayouts = new BindGroupLayouts();
        this.fallbackResources = new FallbackResources();
        this._renderPassManager = new RenderPassManager();
    }

    async initialize(): Promise<void>
    {
        await this._deviceManager.initialize();

        this.bindGroupLayouts.initialize(this.device);
        this.bufferManager.initialize(this.device);
        this.fallbackResources.initialize(this.device);
        this.fallbackResources.createMaterialBindGroup(this.device, this.bindGroupLayouts.material);

        this._renderPassManager.initialize(
            this.device,
            this._deviceManager.context,
            this.bindGroupLayouts,
            this.bufferManager,
            this.fallbackResources,
            this.deviceFormat
        );

        this._deviceManager.onResizeCallback = (width, height) =>
        {
            this._renderPassManager.resize(this.device, width, height, this.deviceFormat);
        };
    }

    render(scene: Scene, camera: Camera, timestamp: number): void
    {
        this._frameCount++;

        // Ensure camera has the latest reflection texture (e.g. after resize)
        camera.setReflectionTexture(this._renderPassManager.reflectionView);

        // Use index assignment for slightly better performance, because .set() creates a temporary array
        this._frameData[0] = timestamp / 1000;
        this._frameData[1] = this._frameCount;
        this._frameData[2] = this._deviceManager.context.canvas.width;
        this._frameData[3] = this._deviceManager.context.canvas.height;

        // Could be used without .buffer, but this way is safer
        this.device.queue.writeBuffer(this.bufferManager.frameBuffer, 0, this._frameData.buffer);

        this._renderPassManager.renderReflection(
            scene,
            camera,
            this._deviceManager.device
        );

        this._renderPassManager.execute(
            scene,
            camera,
            this._deviceManager.device,
            this._deviceManager.context
        );
    }

    get reflectionTextureView(): GPUTextureView
    {
        return this._renderPassManager.reflectionView;
    }
}