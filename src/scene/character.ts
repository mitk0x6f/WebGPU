// scene/character.ts

import { vec3 } from 'gl-matrix';

import { InputManager } from '../core/input-manager';
import { DEG_TO_RAD } from '../core/math-constants';
import { Mesh } from './renderables/mesh';

export class Character
{
    public mesh: Mesh;
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

        // Movement
        const rad = this.rotation * DEG_TO_RAD;

        // Standard WebGPU: Forward is -Z, Right is +X
        // => 0 deg -> -Z (Forward)
        // +Rotation = CCW
        // 90 deg (CCW) -> -X (Forward)

        // Forward:
        // 0 -> (0, 0, -1)
        // 90 -> (-1, 0, 0)
        // x = -sin(rad)
        // z = -cos(rad)
        vec3.set(this._forward, -Math.sin(rad), 0, -Math.cos(rad));

        // Right:
        // 0 -> (1, 0, 0)
        // 90 -> (0, 0, -1)
        // x = cos(rad)
        // z = -sin(rad)
        vec3.set(this._right, Math.cos(rad), 0, -Math.sin(rad));

        vec3.zero(this._velocity);

        const buttons = input.getMouseButtons();
        const rightClickHeld = (buttons & 2) !== 0;

        if (input.isKeyPressed('w')) vec3.add(this._velocity, this._velocity, this._forward);
        if (input.isKeyPressed('s')) vec3.sub(this._velocity, this._velocity, this._forward);

        const moveLeft = input.isKeyPressed('q') || (rightClickHeld && input.isKeyPressed('a'));
        const moveRight = input.isKeyPressed('e') || (rightClickHeld && input.isKeyPressed('d'));

        if (moveLeft) vec3.sub(this._velocity, this._velocity, this._right); // Strafe Left (relative to character)
        if (moveRight) vec3.add(this._velocity, this._velocity, this._right); // Strafe Right (relative to character)

        // Rotation
        const dt = deltaTime * 0.001;

        // Standard: +Rotation is CCW (Left). -Rotation is CW (Right).
        if (rightClickHeld)
        {
            if (input.isKeyPressed('a')) this.rotation += this._rotationSpeed * dt; // A -> Left (CCW) -> +Rotation
            if (input.isKeyPressed('d')) this.rotation -= this._rotationSpeed * dt; // D -> Right (CW) -> -Rotation
        }

        if (vec3.length(this._velocity) > 0)
        {
            vec3.normalize(this._velocity, this._velocity);
            vec3.scale(this._velocity, this._velocity, this._speed * dt);
            vec3.add(this.position, this.position, this._velocity);
        }

        // Update mesh
        // We cast to vec3 because gl-matrix accepts Float32Array
        vec3.copy(this.mesh.position as vec3, this.position);

        // Rotate 180 to face -Z (Forward)
        this.mesh.rotation[1] = this.rotation + 180;
    }
}
