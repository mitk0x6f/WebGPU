// scene/camera/free-camera-controller.ts

import { vec3 } from 'gl-matrix';

import { InputManager } from '../../core/input-manager';
import { BaseCamera } from './base-camera';

export class FreeCameraController
{
    private _camera: BaseCamera;
    private _speed = 25;
    private _sensitivity = 0.2;

    constructor(camera: BaseCamera)
    {
        this._camera = camera;
    }

    public update(deltaTime: number, input: InputManager): void
    {
        const velocity = this._speed * deltaTime * 0.001;

        const pos = this._camera.position;
        /**
         * Forward vector (-Z)
         */
        const front = this._camera.front;
        /**
         * Right vector (X)
         */
        const right = this._camera.right;
        /**
         * Up vector (Y)
         */
        const up = this._camera.up;

        if (input.isKeyPressed('w')) vec3.scaleAndAdd(pos, pos, front, velocity);
        if (input.isKeyPressed('s')) vec3.scaleAndAdd(pos, pos, front, -velocity);
        if (input.isKeyPressed('a')) vec3.scaleAndAdd(pos, pos, right, -velocity);
        if (input.isKeyPressed('d')) vec3.scaleAndAdd(pos, pos, right, velocity);
        if (input.isKeyPressed('q')) vec3.scaleAndAdd(pos, pos, up, -velocity);
        if (input.isKeyPressed('e')) vec3.scaleAndAdd(pos, pos, up, velocity);

        // Mouse rotation
        const buttons = input.getMouseButtons();

        if ((buttons & 1) || (buttons & 2))
        {
            const delta = input.consumeMouseDelta();
            this._camera.yaw += delta.x * this._sensitivity;

            let pitch = this._camera.pitch + delta.y * this._sensitivity;
            // Clamp pitch
            pitch = Math.max(-89, Math.min(89, pitch));
            this._camera.pitch = pitch;
        }
        else
        {
            // Consume delta anyway to prevent jump when clicking again
            input.consumeMouseDelta();
        }

        this._camera.updateMatrices();
    }
}
