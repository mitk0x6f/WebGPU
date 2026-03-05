// scene/camera/third-person-camera-controller.ts

import { vec3 } from 'gl-matrix';

import { InputManager } from '../../core/input-manager';
import { DEG_TO_RAD, RAD_TO_DEG } from '../../core/math-constants';
import { Character } from '../character';
import { BaseCamera } from './base-camera';

export class ThirdPersonCameraController
{
    private _camera: BaseCamera;
    private _target: Character;

    // * Camera Configuration
    // Vertical offset from the character's pivot (feet).
    // 1.4 = Shoulder level. 0.5 = Waist level.
    private _height = 1.8;
    // Initial vertical angle in degrees.
    // Negative = Looking down. Positive = Looking up.
    private _pitch = -10;
    // Base horizontal offset distance for over-the-shoulder look.
    private _shoulderOffset = 0.8;
    // Which side the camera is on: -1 (Left), 0 (Center), 1 (Right).
    private _targetShoulderSide = 1.0;
    // The shoulder side value at the start of the current ease-out quart transition.
    private _shoulderTransitionFrom = 1.0;
    // Normalized progress (0 → 1) of the shoulder side transition.
    private _shoulderTransitionProgress = 1.0;
    // Duration in seconds for the shoulder side ease-out quart transition.
    private _shoulderEaseDuration = 0.4;
    // Distance from the camera to the target pivot point.
    // Controls how far back the camera is.
    private _currentDistance = 2.5;

    // * Spring Arm Configuration
    private _targetDistance = 2.5; // Starts at current
    private _minDistance = 1.0;
    private _maxDistance = 10.0;
    private _zoomSpeed = 0.1; // How much distance changes per scroll tick

    public get height(): number { return this._height; }
    public set height(v: number) { this._height = v; }

    public get pitch(): number { return this._pitch; }
    public set pitch(v: number) { this._pitch = v; }

    public get shoulderOffset(): number { return this._shoulderOffset; }
    public set shoulderOffset(v: number) { this._shoulderOffset = v; }

    public get shoulderSide(): number { return this._targetShoulderSide; }
    public set shoulderSide(v: number) { this.setShoulderSide(v); }

    public get distance(): number { return this._targetDistance; }
    public set distance(v: number) { this._targetDistance = v; }

    public get minDistance(): number { return this._minDistance; }
    public set minDistance(v: number) { this._minDistance = v; }

    public get maxDistance(): number { return this._maxDistance; }
    public set maxDistance(v: number) { this._maxDistance = v; }

    /**
     * Internal method to trigger the move-transition when the shoulder side changes via code or UI.
     */
    private setShoulderSide(newSide: number): void
    {
        if (newSide !== this._targetShoulderSide)
        {
            this._shoulderTransitionFrom = this.lerp(
                this._shoulderTransitionFrom, this._targetShoulderSide,
                this.easeOutQuart(this._shoulderTransitionProgress)
            );
            this._shoulderTransitionProgress = 0;
            this._targetShoulderSide = newSide;
        }
    }

    // * Smoothing Configuration
    // Higher = Snappier/Faster. Lower = Smoother/Laggy.
    private readonly SMOOTH_FACTOR = 18.0;

    // Target orbit values (where input intends to go)
    private _targetOrbitYaw = 0;
    private _targetOrbitPitch = -10;

    // Current smoothed orbit values (where the camera actually is)
    private _currentOrbitYaw = 0;
    private _currentOrbitPitch = -10;

    // Tracks previous buttons state to detect when a mouse button is released
    private _previousButtons = 0;

    // Target for character smoothly aligning to camera
    private _characterTargetYaw: number | null = null;

    // Cached vector objects to prevent memory allocation / Garbage Collection every frame
    private readonly _tempCameraPos = vec3.create();
    private readonly _tempTargetPivot = vec3.create();
    private readonly _tempFront = vec3.create();

    constructor(camera: BaseCamera, target: Character)
    {
        this._camera = camera;
        this._target = target;

        // Initialize to character's starting rotation so we start behind them
        this._targetOrbitYaw = this._target.rotation;
        this._currentOrbitYaw = this._targetOrbitYaw;

        this._targetOrbitPitch = this._pitch;
        this._currentOrbitPitch = this._targetOrbitPitch;
    }


    public update(deltaTime: number, input: InputManager, ignoreInput = false): void
    {
        if (ignoreInput) return;

        const buttons = input.getMouseButtons();

        // Check if right click was just released
        const rightClickReleased = (this._previousButtons & 2) !== 0 && (buttons & 2) === 0;

        // If right drag just ended, immediately snap the target to the current position
        // to stop any residual smooth momentum on the camera.
        if (rightClickReleased)
        {
            this._targetOrbitYaw = this._currentOrbitYaw;
            this._targetOrbitPitch = this._currentOrbitPitch;
        }

        // Mouse rotation
        if ((buttons & 1) || (buttons & 2))
        {
            const delta = input.consumeMouseDelta();

            // Both left and right click change pitch (up/down)
            this._targetOrbitPitch -= delta.y * 0.3; // Mouse Up -> Pitch Decrease -> Camera Down -> Look Up
            this._targetOrbitPitch = Math.max(-89, Math.min(89, this._targetOrbitPitch));

            // Orbit Yaw (Left/Right)
            this._targetOrbitYaw -= delta.x * 0.3;

            // If right-clicking, track the camera orientation
            if (buttons & 2) this._characterTargetYaw = this._targetOrbitYaw;
        }
        else
        {
            // Even if ignored or no buttons, we must consume delta to prevent jumps later
            input.consumeMouseDelta();

            // Keyboard rotation (A/D) when no mouse buttons are pressed
            // Matches character's hardcoded rotation speed (120 deg/s)
            const dt = deltaTime * 0.001;

            // If using A/D, sync the character orientation to the new orbit yaw
            if (input.isKeyPressed('a') || input.isKeyPressed('d'))
            {
                if (input.isKeyPressed('a')) this._targetOrbitYaw += 120 * dt;
                if (input.isKeyPressed('d')) this._targetOrbitYaw -= 120 * dt;

                this._characterTargetYaw = this._targetOrbitYaw;
            }
        }

        // Mouse Scroll / Zoom (Spring Arm Target Distance)
        const scrollDelta = input.consumeScrollDelta();

        if (scrollDelta !== 0)
        {
            this._targetDistance += scrollDelta * this._zoomSpeed;
            // Clamp target distance
            this._targetDistance = Math.max(this._minDistance, Math.min(this._maxDistance, this._targetDistance));
        }

        // Camera Shoulder Settings (Left / Center / Right)
        // When the target side changes, start a new ease-out quart transition
        // from the current (possibly mid-transition) shoulder side value.
        // 1: Left, 2: Center, 3: Right
        let newShoulderSide: number | null = null;

        if (input.isKeyPressed('1')) newShoulderSide = -1.0;
        if (input.isKeyPressed('2')) newShoulderSide = 0.0;
        if (input.isKeyPressed('3')) newShoulderSide = 1.0;

        if (newShoulderSide !== null && newShoulderSide !== this._targetShoulderSide)
        {
            // Derive the current eased value on-the-fly and use it as the new start point.
            // This allows seamless mid-transition direction changes.
            this._shoulderTransitionFrom = this.lerp(
                this._shoulderTransitionFrom, this._targetShoulderSide,
                this.easeOutQuart(this._shoulderTransitionProgress)
            );
            this._shoulderTransitionProgress = 0;
            this._targetShoulderSide = newShoulderSide;
        }

        // Smoothly rotate the character model to catch up
        if (this._characterTargetYaw !== null)
        {
            const charT = 1.0 - Math.pow(0.001, deltaTime * 0.001 * 12.0); // Fast but smooth catch-up speed
            this._target.rotation = this.lerpAngle(this._target.rotation, this._characterTargetYaw, charT);

            // Stop tracking if we're super close
            let charDiff = (this._characterTargetYaw - this._target.rotation) % 360;

            if (charDiff < -180) charDiff += 360;
            if (charDiff > 180) charDiff -= 360;
            if (Math.abs(charDiff) < 0.1) this._characterTargetYaw = null;
        }

        this._previousButtons = buttons;

        // Time-corrected lerp factor for smooth rotation frame-rate independence
        const t = 1.0 - Math.pow(0.001, deltaTime * 0.001 * this.SMOOTH_FACTOR);

        this._currentOrbitYaw = this.lerpAngle(this._currentOrbitYaw, this._targetOrbitYaw, t);
        this._currentOrbitPitch = this.lerp(this._currentOrbitPitch, this._targetOrbitPitch, t);

        // Smoothly adjust current distance towards target (Spring Arm effect)
        const distanceT = 1.0 - Math.pow(0.001, deltaTime * 0.001 * (this.SMOOTH_FACTOR * 0.5)); // Zoom smoothing can be slightly slower than rotation
        this._currentDistance = this.lerp(this._currentDistance, this._targetDistance, distanceT);

        // Advance shoulder transition progress and apply ease-out quart curve.
        // Progress is clamped to [0, 1] so the transition naturally settles.
        if (this._shoulderTransitionProgress < 1.0)
        {
            this._shoulderTransitionProgress += (deltaTime * 0.001) / this._shoulderEaseDuration;
            this._shoulderTransitionProgress = Math.min(this._shoulderTransitionProgress, 1.0);
        }

        const currentShoulderSide = this.lerp(
            this._shoulderTransitionFrom, this._targetShoulderSide,
            this.easeOutQuart(this._shoulderTransitionProgress)
        );

        const radYaw = this._currentOrbitYaw * DEG_TO_RAD;
        const radPitch = this._currentOrbitPitch * DEG_TO_RAD;

        // * Solve Spring Arm *

        // Pitch: -10 means looking down. Camera should be UP.
        // So we use -radPitch for elevation.
        const hDist = this._currentDistance * Math.cos(-radPitch);
        const vDist = this._currentDistance * Math.sin(-radPitch);

        // Standard Orbit Offset (Behind)
        const orbitOffsetX = hDist * Math.sin(radYaw);
        const orbitOffsetZ = hDist * Math.cos(radYaw);

        // Shoulder Offset (Right)
        // We need the Right vector relative to the current Yaw.
        // Yaw 0 -> Forward -Z. Right +X.
        // Right Vector = (cos(yaw), 0, -sin(yaw))
        const rightX = Math.cos(radYaw);
        const rightZ = -Math.sin(radYaw);

        const activeShoulderOffset = this._shoulderOffset * currentShoulderSide;
        const shoulderOffsetX = rightX * activeShoulderOffset;
        const shoulderOffsetZ = rightZ * activeShoulderOffset;

        const cameraPos = this._tempCameraPos;
        // Basic Ideal Target Orbit Position = Target Pivot + Shoulder Offset
        const targetPivot = this._tempTargetPivot;
        vec3.copy(targetPivot, this._target.position);
        targetPivot[0] += shoulderOffsetX;
        targetPivot[1] += this._height;
        targetPivot[2] += shoulderOffsetZ;

        // Position = Target Pivot + Orbit Offset
        // This is our ideal Spring Arm camera location before any collision sweep
        cameraPos[0] = targetPivot[0] + orbitOffsetX;
        cameraPos[1] = targetPivot[1] + vDist;
        cameraPos[2] = targetPivot[2] + orbitOffsetZ;

        // TODO: Collision Sweeping
        // Swept Sphere or Raycast from `targetPivot` to `cameraPos`.
        // If hit, move `cameraPos` to hit location (slightly pushed forward) so we never clip through geometry.

        // We copy it into the camera's position array so we don't accidentally mutate it elsewhere
        vec3.copy(this._camera.position as vec3, cameraPos);

        // Calculate vector from camera to target pivot (where we are looking)
        // This keeps the character offset properly based on the shoulder settings
        const front = this._tempFront;
        vec3.sub(front, targetPivot, cameraPos);
        vec3.normalize(front, front);

        // Extract yaw/pitch from front vector to set on camera
        // This ensures the camera's internal vectors match where it's looking
        const pitch = Math.asin(front[1]) * RAD_TO_DEG;

        // atan2(x, z) gives angle from Z axis
        // We need to match BaseCamera's rotation logic
        // BaseCamera: rotateY(-yaw) -> rotateX(-pitch) -> (0,0,1)
        // We simply reverse-engineer the yaw that results in this front vector
        const yaw = Math.atan2(-front[0], -front[2]) * RAD_TO_DEG;

        this._camera.yaw = -yaw;
        this._camera.pitch = -pitch; // BaseCamera expects +Pitch = Look Down

        this._camera.updateMatrices();
    }

    private lerp(start: number, end: number, t: number): number
    {
        return start * (1 - t) + end * t;
    }

    private lerpAngle(start: number, end: number, t: number): number
    {
        let diff = (end - start) % 360;

        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;

        return start + diff * t;
    }

    /**
     * Ease-Out Quart: 1 - (1 - t)^4
     * Starts fast, decelerates sharply toward the end for a smooth landing.
     * @param t - Normalized progress in [0, 1].
     * @returns The eased value in [0, 1].
     */
    private easeOutQuart(t: number): number
    {
        const inv = 1 - t;

        return 1 - inv * inv * inv * inv;
    }
}
