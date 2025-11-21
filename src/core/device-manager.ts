// core/device-manager.ts

export class DeviceManager
{
    private readonly _canvas: HTMLCanvasElement;
    private _format!: GPUTextureFormat;

    public device!: GPUDevice;
    public context!: GPUCanvasContext;

    get format(): GPUTextureFormat
    {
        return this._format;
    }

    constructor(canvas: HTMLCanvasElement)
    {
        this._canvas = canvas;

        // Attach resize handler, so we keep the proper aspect ratio.
        this._onResize = this._onResize.bind(this);
        window.addEventListener("resize", this._onResize);
    }

    public onResizeCallback: ((width: number, height: number) => void) | null = null;

    private _resizeCanvasToDisplaySize(): void
    {
        const dpr = window.devicePixelRatio || 1;
        const width = Math.floor(this._canvas.clientWidth * dpr);
        const height = Math.floor(this._canvas.clientHeight * dpr);

        if (this._canvas.width !== width || this._canvas.height !== height)
        {
            this._canvas.width = width;
            this._canvas.height = height;
        }
    }

    private _configureContext(): void
    {
        this.context.configure({
            device: this.device,
            format: this._format,
            alphaMode: "opaque"
        });
    }

    private _onResize(): void
    {
        if (!this.device || !this.context) return;

        this._resizeCanvasToDisplaySize();
        this._configureContext();

        if (this.onResizeCallback)
        {
            this.onResizeCallback(this._canvas.width, this._canvas.height);
        }
    }

    async initialize(): Promise<void>
    {
        if (!navigator.gpu) throw new Error("WebGPU is not supported in this browser.");

        const adapter = await navigator.gpu.requestAdapter();

        if (!adapter) throw new Error("Failed to get GPU adapter.");

        this.device = await adapter.requestDevice();
        this.context = this._canvas.getContext("webgpu")!;
        this._format = navigator.gpu.getPreferredCanvasFormat();

        this._resizeCanvasToDisplaySize();
        this._configureContext();
    }

    public dispose(): void
    {
        window.removeEventListener("resize", this._onResize);
    }
}
