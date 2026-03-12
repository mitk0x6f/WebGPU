// core/input-action.ts

/**
 * Enumeration of all available logical input actions in the game.
 */
export const InputAction = {
    MoveForward: 'MoveForward',
    MoveBackward: 'MoveBackward',
    StrafeLeft: 'MoveLeft',
    StrafeRight: 'MoveRight',
    MoveUp: 'MoveUp',
    MoveDown: 'MoveDown',
    TurnLeft: 'RotateLeft',
    TurnRight: 'RotateRight',
    SwitchCamera: 'SwitchCamera',
    ToggleUI: 'ToggleUI',
    CameraShoulderLeft: 'CameraShoulderLeft',
    CameraCenter: 'CameraCenter',
    CameraShoulderRight: 'CameraShoulderRight',
    CameraShoulderToggle: 'CameraShoulderToggle',
    Look: 'Look',
    LookRotate: 'LookRotate',
} as const;

export type InputAction = typeof InputAction[keyof typeof InputAction];

export interface GameplaySettings
{
    shoulderToggleFirstSide: 'Left' | 'Right';
}

/**
 * Interface for an input binding, which can be a single key or a combination (modifiers + key).
 */
export interface InputBinding
{
    key: string;
    shift?: boolean;
    ctrl?: boolean;
    alt?: boolean;
    meta?: boolean; // 'Command' on macOS, 'Windows' on Windows
    rmb?: boolean; // Right Mouse Button
}

/**
 * Type for the complete input mapping configuration.
 * Supports both single bindings and multiple bindings (arrays) per action.
 */
export type InputMapping = Record<InputAction, InputBinding | InputBinding[] | null>;

/**
 * Helper to convert a binding to a human-readable string.
 */
export function bindingToString(binding: InputBinding): string
{
    const parts: string[] = [];

    if (binding.ctrl) parts.push('Ctrl');
    if (binding.shift) parts.push('Shift');
    if (binding.alt) parts.push('Alt');
    if (binding.meta) parts.push('Meta');
    if (binding.rmb) parts.push('RMB');

    // Format mouse buttons or capitalize keys
    let keyStr = binding.key;

    if (keyStr === 'mouse0') keyStr = 'LMB';
    else if (keyStr === 'mouse1') keyStr = 'MMB';
    else if (keyStr === 'mouse2') keyStr = 'RMB';
    else keyStr = keyStr.length === 1 ? keyStr.toUpperCase() : keyStr.charAt(0).toUpperCase() + keyStr.slice(1);

    parts.push(keyStr);

    return parts.join('+');
}
