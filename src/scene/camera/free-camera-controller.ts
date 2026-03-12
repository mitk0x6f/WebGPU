// scene/camera/free-camera-controller.ts

import { vec3 } from 'gl-matrix';

import { InputManager } from '../../core/input-manager';
import { InputAction } from '../../core/input-action';
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

    public update(deltaTime: number, input: InputManager, ignoreInput = false): void
    {
        if (ignoreInput) return;

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

        if (input.isActionPressed(InputAction.MoveForward)) vec3.scaleAndAdd(pos, pos, front, velocity);
        if (input.isActionPressed(InputAction.MoveBackward)) vec3.scaleAndAdd(pos, pos, front, -velocity);
        if (input.isActionPressed(InputAction.TurnLeft)) vec3.scaleAndAdd(pos, pos, right, -velocity);
        if (input.isActionPressed(InputAction.TurnRight)) vec3.scaleAndAdd(pos, pos, right, velocity);
        if (input.isActionPressed(InputAction.MoveDown)) vec3.scaleAndAdd(pos, pos, up, -velocity);
        if (input.isActionPressed(InputAction.MoveUp)) vec3.scaleAndAdd(pos, pos, up, velocity);

        // Mouse rotation
        const looking = input.isActionPressed(InputAction.Look);
        const lookRotating = input.isActionPressed(InputAction.LookRotate);

        if (looking || lookRotating)
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
