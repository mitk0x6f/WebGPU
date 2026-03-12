// core/input-manager.ts

import { InputAction } from './input-action';
import type { InputBinding } from './input-action';
import { InputMapper } from './input-mapper';

export class InputManager
{
    private _keysPressed: Set<string> = new Set();
    private _mouseDelta = { x: 0, y: 0 };
    private _scrollDelta = 0;
    private _mouseButtons = 0;

    // Edge detection: tracks actions that were pressed in the previous frame
    private _actionsPressedLastFrame: Set<InputAction> = new Set();
    private _actionsPressedThisFrame: Set<InputAction> = new Set();
    private _actionKeys: InputAction[];

    private _inputMapper: InputMapper;

    // Track modifier keys specifically for combination detection
    private _modifiers = {
        shift: false,
        ctrl: false,
        alt: false,
        meta: false,
        rmb: false
    };

    public get modifiers() { return this._modifiers; }

    constructor(inputMapper: InputMapper)
    {
        this._inputMapper = inputMapper;
        this._actionKeys = Object.values(InputAction) as InputAction[];
        this._setupListeners();
    }

    private _setupListeners(): void
    {
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        window.addEventListener('contextmenu', this._onContextMenu);
        window.addEventListener('mousedown', this._onMouseDown);
        window.addEventListener('mouseup', this._onMouseUp);
        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('wheel', this._onWheel, { passive: true });
    }

    private _onKeyDown = (e: KeyboardEvent) => {
        this._keysPressed.add(e.key.toLowerCase());
        this._updateModifiers(e);
    };

    private _onKeyUp = (e: KeyboardEvent) => {
        this._keysPressed.delete(e.key.toLowerCase());
        this._updateModifiers(e);
    };

    private _onContextMenu = (e: MouseEvent) => e.preventDefault();

    private _onMouseDown = (e: MouseEvent) => {
        this._mouseButtons = e.buttons;
        this._keysPressed.add(`mouse${e.button}`);
        this._updateMouseModifiers(e);
    };

    private _onMouseUp = (e: MouseEvent) => {
        this._mouseButtons = e.buttons;
        this._keysPressed.delete(`mouse${e.button}`);
        this._updateMouseModifiers(e);

        if (this._mouseButtons === 0 && document.pointerLockElement) document.exitPointerLock();
    };

    private _onMouseMove = (e: MouseEvent) => {
        // Accumulate movement
        this._mouseDelta.x += e.movementX;
        this._mouseDelta.y += e.movementY;
    };

    private _onWheel = (e: WheelEvent) => {
        // Accumulate scroll
        this._scrollDelta += Math.sign(e.deltaY);
    };

    private _updateModifiers(e: KeyboardEvent): void
    {
        this._modifiers.shift = e.shiftKey;
        this._modifiers.ctrl = e.ctrlKey;
        this._modifiers.alt = e.altKey;
        this._modifiers.meta = e.metaKey;
    }

    private _updateMouseModifiers(e: MouseEvent): void
    {
        this._modifiers.rmb = (e.buttons & 2) !== 0;
    }

    /**
     * Internal check for whether an action is active based on current state.
     */
    private _checkAction(action: InputAction): boolean
    {
        const bindingOrBindings = this._inputMapper.getBinding(action);

        if (!bindingOrBindings) return false;

        const bindings = Array.isArray(bindingOrBindings) ? bindingOrBindings : [bindingOrBindings];

        for (const binding of bindings)
        {
            if (this._checkBinding(binding)) return true;
        }

        return false;
    }

    private _checkBinding(binding: InputBinding): boolean
    {
        // Key/Mouse button check
        // Keys are pre-normalized to lowercase in InputMapper
        if (!this._keysPressed.has(binding.key)) return false;

        // Modifier check. We ensure that required modifiers match the current state.
        if (binding.shift !== undefined && binding.shift !== this._modifiers.shift) return false;
        if (binding.ctrl !== undefined && binding.ctrl !== this._modifiers.ctrl) return false;
        if (binding.alt !== undefined && binding.alt !== this._modifiers.alt) return false;
        if (binding.meta !== undefined && binding.meta !== this._modifiers.meta) return false;

        // SPECIAL CASE: The RMB modifier check.
        // If the key itself IS 'mouse2' (Right Mouse Button), then having RMB modifier active
        // (which is calculated from mouse2 being held) should NOT block the action.
        const key = binding.key;

        if (key !== 'mouse2' && (binding.rmb !== undefined && binding.rmb !== this._modifiers.rmb)) return false;

        return true;
    }

    /**
     * Checks if a logical action is currently active.
     */
    public isActionPressed(action: InputAction): boolean
    {
        return this._checkAction(action);
    }

    /**
     * Checks if a logical action was just triggered this frame.
     */
    public isActionJustPressed(action: InputAction): boolean
    {
        return this._actionsPressedThisFrame.has(action) && !this._actionsPressedLastFrame.has(action);
    }

    /**
     * Must be called at the end of every frame to update action history.
     */
    public update(): void
    {
        // Swap history
        this._actionsPressedLastFrame.clear();

        for (const action of this._actionsPressedThisFrame) this._actionsPressedLastFrame.add(action);

        // Re-evaluate what's pressed now for the next frame's 'JustPressed' check
        this._actionsPressedThisFrame.clear();

        for (let i = 0; i < this._actionKeys.length; i++)
        {
            const action = this._actionKeys[i];

            if (this._checkAction(action)) this._actionsPressedThisFrame.add(action);
        }
    }

    public isKeyPressed(key: string): boolean
    {
        return this._keysPressed.has(key.toLowerCase());
    }

    public getMouseButtons(): number
    {
        return this._mouseButtons;
    }

    public consumeMouseDelta(): { x: number, y: number }
    {
        const delta = { ...this._mouseDelta };

        this._mouseDelta.x = 0;
        this._mouseDelta.y = 0;

        return delta;
    }

    public consumeScrollDelta(): number
    {
        const scroll = this._scrollDelta;
        this._scrollDelta = 0;

        return scroll;
    }

    public dispose(): void
    {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        window.removeEventListener('contextmenu', this._onContextMenu);
        window.removeEventListener('mousedown', this._onMouseDown);
        window.removeEventListener('mouseup', this._onMouseUp);
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('wheel', this._onWheel);

        this._keysPressed.clear();
        this._actionsPressedLastFrame.clear();
        this._actionsPressedThisFrame.clear();
    }
}
