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

    private _speed = 3; // Character speed in m/s
    /**
     * Rotation speed in degrees per second
     */
    private _rotationSpeed = 120;

    constructor(mesh: Mesh)
    {
        this.mesh = mesh;
    }

    public update(deltaTime: number, input: InputManager): void
    {
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
        const forward = vec3.fromValues(-Math.sin(rad), 0, -Math.cos(rad));

        // Right:
        // 0 -> (1, 0, 0)
        // 90 -> (0, 0, -1)
        // x = cos(rad)
        // z = -sin(rad)
        const right = vec3.fromValues(Math.cos(rad), 0, -Math.sin(rad));

        const velocity = vec3.create();

        if (input.isKeyPressed('w')) vec3.add(velocity, velocity, forward);
        if (input.isKeyPressed('s')) vec3.sub(velocity, velocity, forward);
        if (input.isKeyPressed('q')) vec3.sub(velocity, velocity, right); // Strafe Left (relative to character)
        if (input.isKeyPressed('e')) vec3.add(velocity, velocity, right); // Strafe Right (relative to character)

        // Rotation
        const dt = deltaTime * 0.001;

        // Standard: +Rotation is CCW (Left). -Rotation is CW (Right).
        if (input.isKeyPressed('a')) this.rotation += this._rotationSpeed * dt; // A -> Left (CCW) -> +Rotation
        if (input.isKeyPressed('d')) this.rotation -= this._rotationSpeed * dt; // D -> Right (CW) -> -Rotation

        if (vec3.length(velocity) > 0)
        {
            vec3.normalize(velocity, velocity);
            vec3.scale(velocity, velocity, this._speed * dt);
            vec3.add(this.position, this.position, velocity);
        }

        // Update mesh
        // We cast to vec3 because gl-matrix accepts Float32Array
        vec3.copy(this.mesh.position as vec3, this.position);

        // Rotate 180 to face -Z (Forward)
        this.mesh.rotation[1] = this.rotation + 180;
    }
}
