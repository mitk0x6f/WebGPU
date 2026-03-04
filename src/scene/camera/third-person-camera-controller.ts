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
    private _height = 1.4;
    // Initial vertical angle in degrees.
    // Negative = Looking down. Positive = Looking up.
    private _pitch = -10;
    // Horizontal offset to the right of the character (Over-the-shoulder).
    // Positive = Right. Negative = Left. 0 = Center.
    private _shoulderOffset = 0.8;
    // Distance from the camera to the target pivot point.
    // Controls how far back the camera is.
    private _currentDistance = 2.5;

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


    public update(deltaTime: number, input: InputManager): void
    {
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

            // If right-clicking, track the camera orientation for character smoothly catching up
            if (buttons & 2) this._characterTargetYaw = this._targetOrbitYaw;
        }
        else
        {
            input.consumeMouseDelta();

            // Keyboard rotation (A/D) when no mouse buttons are pressed
            // Matches character's hardcoded rotation speed (120 deg/s)
            const dt = deltaTime * 0.001;

            // If they start using A/D, cancel any residual character smooth alignment
            if (input.isKeyPressed('a') || input.isKeyPressed('d'))
            {
                this._characterTargetYaw = null;

                if (input.isKeyPressed('a')) this._targetOrbitYaw += 120 * dt;
                if (input.isKeyPressed('d')) this._targetOrbitYaw -= 120 * dt;
            }
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

        const radYaw = this._currentOrbitYaw * DEG_TO_RAD;
        const radPitch = this._currentOrbitPitch * DEG_TO_RAD;

        // Calculate offset from target

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

        const shoulderOffsetX = rightX * this._shoulderOffset;
        const shoulderOffsetZ = rightZ * this._shoulderOffset;

        const cameraPos = this._tempCameraPos;
        // Position = Target + ShoulderOffset + OrbitOffset
        cameraPos[0] = this._target.position[0] + shoulderOffsetX + orbitOffsetX;
        cameraPos[1] = this._target.position[1] + this._height + vDist;
        cameraPos[2] = this._target.position[2] + shoulderOffsetZ + orbitOffsetZ;

        // We could also smooth the camera position itself for "lag" effect,
        // but smoothing the angles usually feels better for orbit.
        // Let's stick to angle smoothing for now.

        // We copy it into the camera's position array so we don't accidentally mutate it elsewhere
        // (though in this design we could just reference it, but safety first!).
        vec3.copy(this._camera.position as vec3, cameraPos);

        // Look at target pivot (Target + ShoulderOffset + Height)
        // This keeps the character on the left side of the screen
        const targetPivot = this._tempTargetPivot;
        vec3.copy(targetPivot, this._target.position);
        targetPivot[0] += shoulderOffsetX;
        targetPivot[1] += this._height;
        targetPivot[2] += shoulderOffsetZ;

        // Calculate vector from camera to target pivot
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
}
