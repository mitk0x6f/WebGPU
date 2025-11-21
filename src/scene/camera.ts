// scene/camera.ts

import { mat4, vec3, quat } from 'gl-matrix';

import type { BindGroupLayouts } from '../core/bindgroup-layouts';
import type { FallbackResources } from '../core/fallback-resources';

export class Camera
{
    private _viewMatrix = mat4.create();
    private _projMatrix = mat4.create();
    private _viewProjMatrix = mat4.create();

    private _position = vec3.create();
    private _cameraData = new Float32Array(20); // Camera view-projection matrix and camera position
    private _target = vec3.create();
    private _front = vec3.fromValues(0, 0, -1); // Looking towards -Z
    private _up = vec3.fromValues(0, 1, 0);
    private _right = vec3.create();
    private _rotationQuat = quat.create();
    private _yaw = 0;
    private _pitch = 0;

    private _speed = 6;
    private _sensitivity = 0.3;

    private _keysPressed: Set<string> = new Set();

    private readonly _canvas: HTMLCanvasElement;
    private readonly _device: GPUDevice;
    private readonly _fovY: number;
    private readonly _near: number;
    private readonly _far: number;

    private _cameraBuffer!: GPUBuffer;

    public sceneBindGroup!: GPUBindGroup

    public get position(): vec3
    {
        return this._position;
    }

    public set position(pos: vec3)
    {
        vec3.copy(this._position, pos);
    }

    public get cameraBuffer(): GPUBuffer
    {
        return this._cameraBuffer;
    }

    constructor(
        canvas: HTMLCanvasElement,
        device: GPUDevice,
        bindGroupLayouts: BindGroupLayouts,
        fallbackResources: FallbackResources,
        fovY: number = 70,
        near: number = 0.1,
        far: number = 435.0 // Skybox is vec3 of variables(250), thus the far corner is calculated using multidimensional Pythagorean theorem and rounded up
    )
    {
        this._canvas = canvas;
        this._device = device;
        this._fovY = fovY;
        this._near = near;
        this._far = far;

        this._cameraBuffer = device.createBuffer({
            size: 80, // viewProjMatrix = 64, cameraPos = 16 (4 floats = 16 bytes) // ! Must be multiple of 16
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.sceneBindGroup = device.createBindGroup({
            layout: bindGroupLayouts.scene,
            entries: [
                { binding: 0, resource: { buffer: this._cameraBuffer } },
                { binding: 1, resource: fallbackResources.defaultSampler },
                { binding: 2, resource: fallbackResources.defaultTextureCubemapView }
            ]
        });

        this._updateVectors();
        this.update();
        this._initInputListeners();
    }

    private _updateVectors(): void
    {
        // Convert yaw/pitch to quaternion (roll = 0)
        quat.identity(this._rotationQuat);
        quat.rotateY(this._rotationQuat, this._rotationQuat, (-this._yaw * Math.PI) / 180);
        quat.rotateX(this._rotationQuat, this._rotationQuat, (-this._pitch * Math.PI) / 180);

        // Transform standard forward/up vectors by quaternion
        vec3.set(this._front, 0, 0, -1);
        vec3.transformQuat(this._front, this._front, this._rotationQuat);
        vec3.normalize(this._front, this._front);

        vec3.set(this._up, 0, 1, 0);
        vec3.transformQuat(this._up, this._up, this._rotationQuat);
        vec3.normalize(this._up, this._up);

        vec3.cross(this._right, this._front, this._up);
        vec3.normalize(this._right, this._right);
    }

    public update(deltaTime: number = 0): void
    {
        const velocity = this._speed * deltaTime / 1000;

        if (this._keysPressed.has('w')) vec3.scaleAndAdd(this._position, this._position, this._front, velocity * this._sensitivity);
        if (this._keysPressed.has('s')) vec3.scaleAndAdd(this._position, this._position, this._front, -velocity * this._sensitivity);
        if (this._keysPressed.has('a')) vec3.scaleAndAdd(this._position, this._position, this._right, -velocity * this._sensitivity);
        if (this._keysPressed.has('d')) vec3.scaleAndAdd(this._position, this._position, this._right, velocity * this._sensitivity);
        if (this._keysPressed.has('q')) vec3.scaleAndAdd(this._position, this._position, this._up, -velocity * this._sensitivity);
        if (this._keysPressed.has('e')) vec3.scaleAndAdd(this._position, this._position, this._up, velocity * this._sensitivity);

        mat4.perspectiveZO(
            this._projMatrix,
            (this._fovY * Math.PI) / 180,
            this._canvas.width / this._canvas.height,
            this._near,
            this._far
        );

        vec3.add(this._target, this._position, this._front);
        mat4.lookAt(this._viewMatrix, this._position, this._target, this._up);
        mat4.multiply(this._viewProjMatrix, this._projMatrix, this._viewMatrix);

        // Copy gl-matrix tuple data into Float32Array buffer
        this._cameraData.set(this._viewProjMatrix, 0);
        this._cameraData.set(this._position, 16);
        // this._positionMatrix[19] is not used, so it will be same as initialized value => 0.0

        // Update the uniform buffer
        // Could be used without .buffer, but this way is safer
        this._device.queue.writeBuffer(this._cameraBuffer, 0, this._cameraData.buffer);
    }

    private _onKeyDown = (e: KeyboardEvent) => this._keysPressed.add(e.key.toLowerCase());
    private _onKeyUp = (e: KeyboardEvent) => this._keysPressed.delete(e.key.toLowerCase());
    private _onMouseMove = (e: MouseEvent) => {
        if (e.buttons === 1)
        {
            this._yaw += e.movementX * this._sensitivity;
            this._pitch += e.movementY * this._sensitivity;

            // Clamp pitch
            this._pitch = Math.max(-89, Math.min(89, this._pitch));

            this._updateVectors();
            this.update();
        }
    };

    private _initInputListeners(): void
    {
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        window.addEventListener('mousemove', this._onMouseMove);
    }

    public dispose(): void
    {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        window.removeEventListener('mousemove', this._onMouseMove);
        this._cameraBuffer.destroy();
    }
}