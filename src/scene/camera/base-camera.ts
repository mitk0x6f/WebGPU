// scene/camera/base-camera.ts

import { mat4, vec3, vec4, quat } from 'gl-matrix';

import type { BindGroupLayouts } from '../../core/bindgroup-layouts';
import type { FallbackResources } from '../../core/fallback-resources';
import { DEG_TO_RAD } from '../../core/math-constants';

export class BaseCamera
{
    protected _viewMatrix = mat4.create();
    protected _projMatrix = mat4.create();
    protected _viewProjMatrix = mat4.create();

    protected _position = vec3.create();
    /**
     * ViewProj (64) + Pos (16)
     */
    protected _cameraData = new Float32Array(20);
    protected _target = vec3.create();
    /**
     * Forward vector (-Z)
     */
    protected _front = vec3.fromValues(0, 0, -1);
    /**
     * Up vector (Y)
     */
    protected _up = vec3.fromValues(0, 1, 0);
    /**
     * Right vector (X)
     */
    protected _right = vec3.create();
    protected _rotationQuat = quat.create();

    /**
     * Yaw in degrees
     */
    protected _yaw = 0;
    /**
     * Pitch in degrees
     */
    protected _pitch = 0;

    protected readonly _canvas: HTMLCanvasElement;
    protected readonly _device: GPUDevice;
    /**
     * Field of view (FOV) in degrees
     */
    protected _fovY: number;
    protected _near: number;
    protected _far: number;

    protected _cameraBuffer!: GPUBuffer;

    public sceneBindGroup!: GPUBindGroup;
    public reflectionSceneBindGroup!: GPUBindGroup;

    protected _clipPlane: vec4 | null = null;

    protected readonly _bindGroupLayouts: BindGroupLayouts;
    protected readonly _fallbackResources: FallbackResources;
    protected _currentReflectionTextureView: GPUTextureView;

    constructor(
        canvas: HTMLCanvasElement,
        device: GPUDevice,
        bindGroupLayouts: BindGroupLayouts,
        fallbackResources: FallbackResources,
        reflectionTextureView: GPUTextureView,
        fovY: number = 70, // Value in degrees
        near: number = 0.1,
        far: number = 435.0
    )
    {
        this._canvas = canvas;
        this._device = device;
        this._bindGroupLayouts = bindGroupLayouts;
        this._fallbackResources = fallbackResources;
        this._currentReflectionTextureView = reflectionTextureView;
        this._fovY = fovY;
        this._near = near;
        this._far = far;

        this._cameraBuffer = device.createBuffer({
            size: 80,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.sceneBindGroup = device.createBindGroup({
            layout: bindGroupLayouts.scene,
            entries: [
                { binding: 0, resource: { buffer: this._cameraBuffer } },
                { binding: 1, resource: fallbackResources.defaultSampler },
                { binding: 2, resource: fallbackResources.defaultTextureCubemapView },
                { binding: 3, resource: reflectionTextureView }
            ]
        });

        this.reflectionSceneBindGroup = device.createBindGroup({
            layout: bindGroupLayouts.scene,
            entries: [
                { binding: 0, resource: { buffer: this._cameraBuffer } },
                { binding: 1, resource: fallbackResources.defaultSampler },
                { binding: 2, resource: fallbackResources.defaultTextureCubemapView },
                { binding: 3, resource: fallbackResources.defaultTextureView }
            ]
        });

        this.updateVectors();
        this.updateMatrices();
    }

    public get fov(): number { return this._fovY; }
    public set fov(v: number) { this._fovY = v; this.updateMatrices(); }

    public get near(): number { return this._near; }
    public set near(v: number) { this._near = v; this.updateMatrices(); }

    public get far(): number { return this._far; }
    public set far(v: number) { this._far = v; this.updateMatrices(); }

    public get position(): vec3 { return this._position; }
    public set position(v: vec3) { vec3.copy(this._position, v); }

    /**
     * Yaw in degrees
     */
    public get yaw(): number { return this._yaw; }
    public set yaw(v: number) { this._yaw = v; this.updateVectors(); }

    /**
     * Pitch in degrees
     */
    public get pitch(): number { return this._pitch; }
    public set pitch(v: number) { this._pitch = v; this.updateVectors(); }

    /**
     * Forward vector (-Z)
     */
    public get front(): vec3 { return this._front; }
    /**
     * Right vector (X)
     */
    public get right(): vec3 { return this._right; }
    /**
     * Up vector (Y)
     */
    public get up(): vec3 { return this._up; }

    public get cameraBuffer(): GPUBuffer { return this._cameraBuffer; }

    public setReflectionTexture(view: GPUTextureView): void
    {
        if (this._currentReflectionTextureView === view) return;

        this._currentReflectionTextureView = view;

        this.sceneBindGroup = this._device.createBindGroup({
            layout: this._bindGroupLayouts.scene,
            entries: [
                { binding: 0, resource: { buffer: this._cameraBuffer } },
                { binding: 1, resource: this._fallbackResources.defaultSampler },
                { binding: 2, resource: this._fallbackResources.defaultTextureCubemapView },
                { binding: 3, resource: view }
            ]
        });
    }

    public setClipPlane(plane: vec4 | null): void
    {
        this._clipPlane = plane;
    }

    public updateVectors(): void
    {
        quat.identity(this._rotationQuat);
        // quat.rotateY(this._rotationQuat, this._rotationQuat, (-this._yaw * Math.PI) / 180);
        quat.rotateY(this._rotationQuat, this._rotationQuat, -this._yaw * DEG_TO_RAD);
        // quat.rotateX(this._rotationQuat, this._rotationQuat, (-this._pitch * Math.PI) / 180);
        quat.rotateX(this._rotationQuat, this._rotationQuat, -this._pitch * DEG_TO_RAD);

        vec3.set(this._front, 0, 0, -1);
        vec3.transformQuat(this._front, this._front, this._rotationQuat);
        vec3.normalize(this._front, this._front);

        vec3.set(this._up, 0, 1, 0);
        vec3.transformQuat(this._up, this._up, this._rotationQuat);
        vec3.normalize(this._up, this._up);

        vec3.cross(this._right, this._front, this._up);
        vec3.normalize(this._right, this._right);
    }

    public updateMatrices(): void
    {
        mat4.perspectiveZO(
            this._projMatrix,
            // (this._fovY * Math.PI) / 180,
            this._fovY * DEG_TO_RAD,
            this._canvas.width / this._canvas.height,
            this._near,
            this._far
        );

        vec3.add(this._target, this._position, this._front);
        mat4.lookAt(this._viewMatrix, this._position, this._target, this._up);

        if (this._clipPlane)
        {
            const clipPlaneCamera = vec4.create();
            const invView = mat4.create();
            const invTransView = mat4.create();
            const q = vec4.create();
            const c = vec4.create();

            mat4.invert(invView, this._viewMatrix);
            mat4.transpose(invTransView, invView);
            vec4.transformMat4(clipPlaneCamera, this._clipPlane, invTransView);

            q[0] = (Math.sign(clipPlaneCamera[0]) + this._projMatrix[8]) / this._projMatrix[0];
            q[1] = (Math.sign(clipPlaneCamera[1]) + this._projMatrix[9]) / this._projMatrix[5];
            q[2] = -1.0;
            q[3] = (1.0 + this._projMatrix[10]) / this._projMatrix[14];

            vec4.scale(c, clipPlaneCamera, 2.0 / vec4.dot(clipPlaneCamera, q));

            this._projMatrix[2] = c[0];
            this._projMatrix[6] = c[1];
            this._projMatrix[10] = c[2] + 1.0;
            this._projMatrix[14] = c[3];
        }

        mat4.multiply(this._viewProjMatrix, this._projMatrix, this._viewMatrix);

        this._cameraData.set(this._viewProjMatrix, 0);
        this._cameraData.set(this._position, 16);

        this._device.queue.writeBuffer(this._cameraBuffer, 0, this._cameraData.buffer);
    }

    public dispose(): void
    {
        this._cameraBuffer.destroy();
    }
}
