// core/input-mapper.ts

import { InputAction } from './input-action';
import type { InputBinding, InputMapping, GameplaySettings } from './input-action';

const STORAGE_KEY = 'm0x6f-input-bindings';

export class InputMapper
{
    private _mapping: InputMapping;
    private _gameplaySettings: GameplaySettings = {
        shoulderToggleFirstSide: 'Right'
    };

    constructor()
    {
        this._mapping = this._getDefaultMapping();
        this.load();
    }

    public get mapping(): InputMapping
    {
        return this._mapping;
    }

    /**
     * Loads the mapping from persistent storage.
     */
    public load(): void
    {
        try
        {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved)
            {
                try
                {
                    const data = JSON.parse(saved);
                    const mapping = { ...this._getDefaultMapping(), ...data.mapping };

                    // Normalize all keys to lowercase for performance
                    for (const action in mapping)
                    {
                        const b = mapping[action as InputAction];

                        if (Array.isArray(b)) b.forEach(v => v.key = v.key.toLowerCase());
                        else if (b) b.key = b.key.toLowerCase();
                    }

                    this._mapping = mapping;

                    if (data.gameplay) this._gameplaySettings = { ...this._gameplaySettings, ...data.gameplay };
                }
                catch (e)
                {
                    this._mapping = this._getDefaultMapping();

                    console.warn('Failed to parse input mapping, using defaults');
                }
            }
        }
        catch (e)
        {
            console.warn('Failed to load input bindings from localStorage, using defaults.', e);
        }
    }

    /**
     * Saves the current mapping to persistent storage.
     */
    public save(): void
    {
        try
        {
            const data = {
                mapping: this._mapping,
                gameplay: this._gameplaySettings
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
        catch (e)
        {
            console.error('Failed to save input bindings to localStorage.', e);
        }
    }

    /**
     * Gets the current binding for a specific action.
     */
    public getBinding(action: InputAction): InputBinding | InputBinding[] | null
    {
        return this._mapping[action];
    }

    /**
     * Updates the binding for a specific action.
     */
    public setBinding(action: InputAction, binding: InputBinding | InputBinding[] | null): void
    {
        // Normalize before saving
        if (Array.isArray(binding)) binding.forEach(v => v.key = v.key.toLowerCase());
        else if (binding) binding.key = binding.key.toLowerCase();

        this._mapping[action] = binding;
        this.save();
    }

    public getGameplaySettings(): GameplaySettings
    {
        return this._gameplaySettings;
    }

    public resetBindingsToDefaults(): void
    {
        this._mapping = this._getDefaultMapping();
        this.save();
    }

    public resetGameplayToDefaults(): void
    {
        this._gameplaySettings = {
            shoulderToggleFirstSide: 'Right'
        };
        this.save();
    }

    private _getDefaultMapping(): InputMapping
    {
        return {
            [InputAction.MoveForward]: { key: 'w' },
            [InputAction.MoveBackward]: { key: 's' },
            [InputAction.TurnLeft]: { key: 'a' },
            [InputAction.TurnRight]: { key: 'd' },
            [InputAction.StrafeLeft]: [
                { key: 'q' },
                { key: 'a', rmb: true }
            ],
            [InputAction.StrafeRight]: [
                { key: 'e' },
                { key: 'd', rmb: true }
            ],
            [InputAction.MoveUp]: { key: 'e' },
            [InputAction.MoveDown]: { key: 'q' },
            [InputAction.Look]: { key: 'mouse0' },
            [InputAction.LookRotate]: { key: 'mouse2' },
            [InputAction.SwitchCamera]: { key: 'tab' },
            [InputAction.ToggleUI]: { key: 'f1' },
            [InputAction.CameraShoulderLeft]: { key: '1' },
            [InputAction.CameraCenter]: { key: '2' },
            [InputAction.CameraShoulderRight]: { key: '3' },
            [InputAction.CameraShoulderToggle]: { key: 'r' },
        };
    }
}
