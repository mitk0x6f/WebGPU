// scene/character.ts

import { vec3 } from 'gl-matrix';

import { InputManager } from '../core/input-manager';
import { InputAction } from '../core/input-action';
import { DEG_TO_RAD } from '../core/math-constants';
import { PhysicsWorld } from '../physics/physics-world';
import { Ray } from '../physics/ray';
import { RaycastHit } from '../physics/collider';
import { Mesh } from './renderables/mesh';

import { CharacterStateMachine } from './character-states/character-state-machine';
import { CharacterStateId } from './character-states/character-state-id';
import { IdleState } from './character-states/idle-state';
import { WalkState } from './character-states/walk-state';

/**
 * Distance above the character's feet origin from which the downward ray is cast.
 * Must be large enough to still hit the ground when the character is standing on it.
 */
const GROUND_RAY_ORIGIN_OFFSET = 0.5;

/**
 * Maximum distance downward the ray travels to detect ground.
 */
const GROUND_RAY_MAX_DISTANCE = 1.0;

/**
 * When airborne this amount of gravity (m/s²) is applied downward each second.
 */
const GRAVITY = 9.81;

/**
 * Maximum surface slope angle (degrees) the character can walk on without sliding.
 */
const MAX_SLOPE_ANGLE_DEG = 46;

/**
 * Distance from the character center to the collision boundary.
 * Also used as the perpendicular spread for multi-ray wall detection.
 */
const COLLISION_RADIUS = 0.4;

/**
 * Height above the character feet to cast horizontal "wall" rays.
 */
const WALL_RAY_ORIGIN_HEIGHT = 1.0;

export class Character
{
    public readonly mesh: Mesh;

    // * State Machine
    public readonly stateMachine: CharacterStateMachine;

    // * Debugging
    public debugStateTint: boolean = false;
    private _lastStateTintId: CharacterStateId | null = null;

    public position = vec3.create();

    /**
     * Rotation around the Y-axis in degrees.
     * Positive = CCW when viewed from above.
     */
    public rotation = 0;

    // * Movement config

    /**
     * Linear speed (m/s).
     */
    private _speed = 3;

    /**
     * Yaw speed (degrees/s).
     */
    private _rotationSpeed = 120;

    // * Physics state

    /**
     * Vertical velocity (m/s, positive = up). Applied when airborne.
     */
    private _verticalVelocity = 0;

    /**
     * Whether the character is touching a walkable surface this frame.
     */
    private _isGrounded = false;

    // * Cached vectors — allocated once to avoid per-frame GC pressure.

    private readonly _forward = vec3.create();
    private readonly _right = vec3.create();
    public readonly velocity = vec3.create();
    private readonly _rayOrigin = vec3.create();
    private readonly _rayDir = vec3.fromValues(0, -1, 0);
    private readonly _groundPoint = vec3.create();
    private readonly _groundNormal = vec3.create();

    // Reusable downward ray (re-used every frame, origin updated before use).
    private readonly _groundRay: Ray;

    // Reusable horizontal wall ray.
    private readonly _wallRay: Ray;
    private readonly _wallRayOrigin = vec3.create();
    private readonly _wallRayDir = vec3.create();

    // Reusable hit objects (zero-allocation physics)
    private readonly _groundHit: RaycastHit;
    private readonly _wallHit: RaycastHit;

    constructor(mesh: Mesh)
    {
        this.mesh = mesh;
        // Pre-allocate the raycast objects. Origins will be set each frame.
        this._groundRay = new Ray(this._rayOrigin, this._rayDir);
        this._wallRay = new Ray(this._wallRayOrigin, this._wallRayDir);

        this._groundHit = new RaycastHit();
        this._wallHit = new RaycastHit();

        // Initialize State Machine
        this.stateMachine = new CharacterStateMachine(this);
        this.stateMachine.registerState(new IdleState());
        this.stateMachine.registerState(new WalkState());
        this.stateMachine.start(CharacterStateId.Idle);
    }

    // * Public API

    /**
     * True if the character was standing on a walkable surface during the last update.
     */
    public get isGrounded(): boolean { return this._isGrounded; }

    /**
     * Per-frame update. Must be called once per game tick.
     *
     * @param deltaTime - Elapsed time in **milliseconds**.
     * @param input - Current input manager.
     * @param physics - The physics world containing all static colliders.
     * @param ignoreInput - When true, halts all movement (e.g. UI focused).
     */
    public update(
        deltaTime: number,
        input: InputManager,
        physics: PhysicsWorld,
        ignoreInput = false
    ): void
    {
        // convert ms → s
        const dt = deltaTime * 0.001;

        // * 1. Ground detection via downward raycast
        this._detectGround(dt, physics);

        if (ignoreInput) return;

        // * 2. State Machine Update (handles movement and rotation logically)
        this.stateMachine.update(dt, input, physics);

        // Debug Tinting Application
        if (this.debugStateTint)
        {
            const currentState = this.stateMachine.currentStateId as CharacterStateId;

            if (this._lastStateTintId !== currentState)
            {
                this._lastStateTintId = currentState;

                if (currentState === CharacterStateId.Idle) this.mesh.tint.set([1, 1, 1, 1]);
                else this.mesh.tint.set([1, 1, 0, 1]);
            }
        }
        else if (this._lastStateTintId !== null)
        {
            // Revert when toggled off
            this._lastStateTintId = null;
            this.mesh.tint.set([1, 1, 1, 1]);
        }

        // * 3. Sync mesh to logical position / rotation
        vec3.copy(this.mesh.position as vec3, this.position);
        this.mesh.rotation[1] = this.rotation + 180; // Model faces -Z at 0°
    }

    // * Movement and Rotation API for States

    /**
     * Clears the current movement velocity.
     */
    public clearVelocity(): void
    {
        vec3.zero(this.velocity);
    }

    /**
     * Handles rotational input from the user.
     */
    public handleRotation(dt: number, input: InputManager): void
    {
        const isLookRotating = input.isActionPressed(InputAction.LookRotate);
        const isRotatingLeft = input.isActionPressed(InputAction.TurnLeft);
        const isRotatingRight = input.isActionPressed(InputAction.TurnRight);
        const isStrafingLeft = input.isActionPressed(InputAction.StrafeLeft);
        const isStrafingRight = input.isActionPressed(InputAction.StrafeRight);

        if (!isLookRotating)
        {
            if (isRotatingLeft && !isStrafingLeft) this.rotation += this._rotationSpeed * dt;
            if (isRotatingRight && !isStrafingRight) this.rotation -= this._rotationSpeed * dt;
        }
    }

    /**
     * Computes movement velocity based on input and applies wall collisions.
     * Returns true if movement input was provided.
     */
    public handleMovement(dt: number, input: InputManager, physics: PhysicsWorld): boolean
    {
        const rad = this.rotation * DEG_TO_RAD;

        // Standard WebGPU convention: Forward = -Z, Right = +X at 0°.
        vec3.set(this._forward, -Math.sin(rad), 0, -Math.cos(rad));
        vec3.set(this._right, Math.cos(rad), 0, -Math.sin(rad));
        vec3.zero(this.velocity);

        if (input.isActionPressed(InputAction.MoveForward)) vec3.add(this.velocity, this.velocity, this._forward);
        if (input.isActionPressed(InputAction.MoveBackward)) vec3.sub(this.velocity, this.velocity, this._forward);
        if (input.isActionPressed(InputAction.StrafeLeft)) vec3.sub(this.velocity, this.velocity, this._right);
        if (input.isActionPressed(InputAction.StrafeRight)) vec3.add(this.velocity, this.velocity, this._right);

        if (vec3.squaredLength(this.velocity) > 0.000001)
        {
            vec3.normalize(this.velocity, this.velocity);
            vec3.scale(this.velocity, this.velocity, this._speed * dt);

            // * Horizontal Collision Detection (Sweep and Slide)
            // We sweep the character's bounding sphere along the velocity vector.
            // If we hit an obstacle, we move to the contact point, project the remaining
            // velocity along the wall's tangent, and sweep again. Max 3 iterations.

            for (let i = 0; i < 3; i++)
            {
                const distanceToMove = vec3.length(this.velocity);

                if (distanceToMove < 0.0001) break;

                // Normalize direction for the raycast
                vec3.scale(this._wallRayDir, this.velocity, 1.0 / distanceToMove);

                vec3.set(this._wallRayOrigin, this.position[0], this.position[1] + WALL_RAY_ORIGIN_HEIGHT, this.position[2]);
                vec3.copy(this._wallRay.origin, this._wallRayOrigin);
                vec3.copy(this._wallRay.direction, this._wallRayDir);

                // Because sphereCast inflates the box, we just cast up to `distanceToMove`
                const eps = 0.001; // Tiny skin-width to prevent float-snapping directly onto faces
                const maxDist = distanceToMove + eps;

                if (physics.raycast(this._wallRay, maxDist, this._wallHit, COLLISION_RADIUS))
                {
                    // Calculate how far we can safely move before hitting the inflated wall
                    let safeDist = this._wallHit.distance - eps;

                    if (safeDist < 0) safeDist = 0;

                    const moveDist = Math.min(distanceToMove, safeDist);

                    // Move up to the wall
                    this.position[0] += this._wallRayDir[0] * moveDist;
                    this.position[2] += this._wallRayDir[2] * moveDist;

                    // Remaining velocity to project and slide
                    const remainingDist = distanceToMove - moveDist;
                    vec3.scale(this.velocity, this._wallRayDir, remainingDist);

                    // Project the remaining velocity onto the wall's plane.
                    const normal = this._wallHit.normal;
                    const dot = vec3.dot(this.velocity, normal);

                    // Remove the component pointing INTO the wall
                    if (dot < 0)
                    {
                        this.velocity[0] -= dot * normal[0];
                        this.velocity[1] -= dot * normal[1];
                        this.velocity[2] -= dot * normal[2];
                    }

                    // Zero out Y changes to enforce 2D horizontal sliding
                    this.velocity[1] = 0;
                }
                else
                {
                    // No collision, move the full distance and exit the loop.
                    this.position[0] += this.velocity[0];
                    this.position[2] += this.velocity[2];

                    break;
                }
            }

            return true;
        }

        return false;
    }

    // * Private helpers

    /**
     * Casts a ray straight down from slightly above the character's feet.
     * - If a walkable surface is found within `GROUND_RAY_MAX_DISTANCE`, the
     *   character is "grounded": Y is snapped to the hit point and vertical
     *   velocity is zeroed.
     * - If no surface is found, gravity accelerates the character downward.
     * - Slopes steeper than `MAX_SLOPE_ANGLE_DEG` are ignored so the character
     *   cannot "snap" onto a vertical wall.
     */
    private _detectGround(dt: number, physics: PhysicsWorld): void
    {
        // Place ray origin slightly above the feet so the ray passes through
        // small micro-geometry before reaching the floor plane.
        vec3.set(
            this._rayOrigin,
            this.position[0],
            this.position[1] + GROUND_RAY_ORIGIN_OFFSET,
            this.position[2]
        );
        // Update the cached Ray's origin in-place (avoid allocation).
        vec3.copy(this._groundRay.origin, this._rayOrigin);

        const groundMaxDistance = GROUND_RAY_ORIGIN_OFFSET + GROUND_RAY_MAX_DISTANCE;

        if (physics.raycast(this._groundRay, groundMaxDistance, this._groundHit))
        {
            if (this._groundHit.distance <= groundMaxDistance)
            {
                // Compute slope: angle between surface normal and world-up (0, 1, 0).
                const slopeAngleDeg = Math.acos(
                    Math.max(-1, Math.min(1, this._groundHit.normal[1]))  // dot with (0, 1, 0)
                ) * (180 / Math.PI);

                if (slopeAngleDeg <= MAX_SLOPE_ANGLE_DEG)
                {
                    // Walkable surface — snap Y and clear vertical velocity.
                    vec3.copy(this._groundPoint,  this._groundHit.point);
                    vec3.copy(this._groundNormal, this._groundHit.normal);

                    this.position[1] = this._groundHit.point[1];
                    this._verticalVelocity = 0;
                    this._isGrounded = true;

                    // Sync mesh immediately after snap.
                    vec3.copy(this.mesh.position as vec3, this.position);

                    return;
                }
            }
        }

        // No walkable ground found — apply gravity.
        this._isGrounded = false;
        this._verticalVelocity -= GRAVITY * dt;
        this.position[1] += this._verticalVelocity * dt;

        // Update mesh right away so it doesn't lag by a frame.
        vec3.copy(this.mesh.position as vec3, this.position);
    }
}
