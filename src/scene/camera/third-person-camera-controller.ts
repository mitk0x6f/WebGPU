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
    // Controls how quickly the camera follows the target rotation.
    // Higher = Snappier/Faster. Lower = Smoother/Laggy.
    // 10.0 = Very Snappy. 4.0 = Balanced. 1.0 = Very Slow.
    private readonly SMOOTH_FACTOR = 4.0;
    // Internal state for smoothing
    private _yawOffset = 0;
    private _currentYaw = 0;
    private _currentPitch = -10;

    constructor(camera: BaseCamera, target: Character)
    {
        this._camera = camera;
        this._target = target;

        // Initialize smoothed values to avoid initial pop
        this._currentYaw = this._target.rotation;
        this._currentPitch = this._pitch;
    }

    public update(deltaTime: number, input: InputManager): void
    {
        // Mouse rotation (orbits around character)
        if (input.getMouseButtons() === 1)
        {
            const delta = input.consumeMouseDelta();

            this._yawOffset -= delta.x * 0.3; // Mouse Right -> Orbit Left -> Look Right
            this._pitch -= delta.y * 0.3; // Mouse Up -> Pitch Decrease -> Camera Down -> Look Up
            this._pitch = Math.max(-89, Math.min(89, this._pitch));
        }
        else
        {
            input.consumeMouseDelta();
        }

        // Reset rotation offset when rotating character
        if (input.isKeyPressed('q') || input.isKeyPressed('e'))
        {
            this._yawOffset = 0;
        }

        // Target values
        const targetTotalYaw = this._target.rotation + this._yawOffset;
        const targetPitch = this._pitch;

        // Smoothly interpolate current values towards target values
        // We use lerpAngle for yaw to handle 360-degree wrapping correctly if needed,
        // but simple lerp is fine here as we don't wrap strictly.
        // Actually, simple lerp on angles can be bad if we cross 360, but our rotation is continuous.

        // Time-corrected lerp factor
        const t = 1.0 - Math.pow(0.001, deltaTime * 0.001 * this.SMOOTH_FACTOR);

        this._currentYaw = this.lerp(this._currentYaw, targetTotalYaw, t);
        this._currentPitch = this.lerp(this._currentPitch, targetPitch, t);

        const radYaw = this._currentYaw * DEG_TO_RAD;
        const radPitch = this._currentPitch * DEG_TO_RAD;

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

        const cameraPos = vec3.create();
        // Position = Target + ShoulderOffset + OrbitOffset
        cameraPos[0] = this._target.position[0] + shoulderOffsetX + orbitOffsetX;
        cameraPos[1] = this._target.position[1] + this._height + vDist;
        cameraPos[2] = this._target.position[2] + shoulderOffsetZ + orbitOffsetZ;

        // We could also smooth the camera position itself for "lag" effect,
        // but smoothing the angles usually feels better for orbit.
        // Let's stick to angle smoothing for now.

        this._camera.position = cameraPos;

        // Look at target pivot (Target + ShoulderOffset + Height)
        // This keeps the character on the left side of the screen
        const targetPivot = vec3.clone(this._target.position);
        targetPivot[0] += shoulderOffsetX;
        targetPivot[1] += this._height;
        targetPivot[2] += shoulderOffsetZ;

        // Calculate vector from camera to target pivot
        const front = vec3.create();
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
}
