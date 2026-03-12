// scene/character.ts

import { vec3 } from 'gl-matrix';

import { InputManager } from '../core/input-manager';
import { InputAction } from '../core/input-action';
import { DEG_TO_RAD } from '../core/math-constants';
import { Mesh } from './renderables/mesh';

export class Character
{
    public readonly mesh: Mesh;

    public position = vec3.create();
    /**
     * Rotation in degrees
     */
    public rotation = 0;

    /**
     * Character speed in m/s
     */
    private _speed = 3;
    /**
     * Rotation speed in degrees per second
     */
    private _rotationSpeed = 120;

    // Cached vectors to avoid per-frame allocations (prevents GC stutters)
    private readonly _forward = vec3.create();
    private readonly _right = vec3.create();
    private readonly _velocity = vec3.create();

    constructor(mesh: Mesh)
    {
        this.mesh = mesh;
    }

    public update(deltaTime: number, input: InputManager, ignoreInput = false): void
    {
        if (ignoreInput) return;

        const dt = deltaTime * 0.001;

        // Calculate local axes based on current rotation
        const rad = this.rotation * DEG_TO_RAD;

        // Standard WebGPU: Forward is -Z, Right is +X
        // => 0 deg -> -Z (Forward)
        // +Rotation = CCW
        // 90 deg (CCW) -> -X (Forward)

        // Forward:
        // x = -sin(rad)
        // z = -cos(rad)
        vec3.set(this._forward, -Math.sin(rad), 0, -Math.cos(rad));

        // Right:
        // x = cos(rad)
        // z = -sin(rad)
        vec3.set(this._right, Math.cos(rad), 0, -Math.sin(rad));

        vec3.zero(this._velocity);

        if (input.isActionPressed(InputAction.MoveForward)) vec3.add(this._velocity, this._velocity, this._forward);
        if (input.isActionPressed(InputAction.MoveBackward)) vec3.sub(this._velocity, this._velocity, this._forward);
        if (input.isActionPressed(InputAction.StrafeLeft)) vec3.sub(this._velocity, this._velocity, this._right);
        if (input.isActionPressed(InputAction.StrafeRight)) vec3.add(this._velocity, this._velocity, this._right);

        // Use squaredLength to avoid sqrt (saves a bit of performance)
        const velSqMag = vec3.squaredLength(this._velocity);

        if (velSqMag > 0.000001)
        {
            vec3.normalize(this._velocity, this._velocity);
            vec3.scale(this._velocity, this._velocity, this._speed * dt);
            vec3.add(this.position, this.position, this._velocity);
        }

        const isRotatingLeft = input.isActionPressed(InputAction.TurnLeft);
        const isRotatingRight = input.isActionPressed(InputAction.TurnRight);
        const isStrafingLeft = input.isActionPressed(InputAction.StrafeLeft);
        const isStrafingRight = input.isActionPressed(InputAction.StrafeRight);

        // If we are strafing via RMB+A, we DON'T want to rotate (handles rebindable combinations)
        const isLookRotating = input.isActionPressed(InputAction.LookRotate);

        if (!isLookRotating)
        {
            if (isRotatingLeft && !isStrafingLeft) this.rotation += this._rotationSpeed * dt;
            if (isRotatingRight && !isStrafingRight) this.rotation -= this._rotationSpeed * dt;
        }

        // NOTE: The "auto-orient to velocity" block was removed here to fix the infinite spinning loop
        // and twitching. The character is now purely MMO-style character-relative, controlled explicitly by A/D or RMB.

        // Update mesh
        // Using vec3.copy to be safe with Float32Array types
        vec3.copy(this.mesh.position as vec3, this.position);

        // Rotate 180 to face -Z (Forward)
        // Mesh.rotation is a vec3 (Euler angles) [Pitch, Yaw, Roll]
        this.mesh.rotation[1] = this.rotation + 180;
    }
}
