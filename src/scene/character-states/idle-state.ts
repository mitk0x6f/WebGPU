// src/scene/character-states/idle-state.ts

import type { Character } from '../character';
import type { InputManager } from '../../core/input-manager';
import { InputAction } from '../../core/input-action';
import type { PhysicsWorld } from '../../physics/physics-world';
import { CharacterStateId } from './character-state-id';
import type { ICharacterState } from './character-state';

export class IdleState implements ICharacterState
{
    public readonly id = CharacterStateId.Idle;

    public enter(character: Character): void
    {
        character.clearVelocity();
    }

    public update(character: Character, dt: number, input: InputManager, _physics: PhysicsWorld): CharacterStateId
    {
        // Even when idle, in-place rotation is permitted
        character.handleRotation(dt, input);

        // Transition to Walk if movement input is detected
        if (this._hasMovementInput(input)) return CharacterStateId.Walk;

        return this.id;
    }

    public exit(_character: Character): void
    {
        // Nothing special to clean up
    }

    // A fast zero-allocation check for movement
    private _hasMovementInput(input: InputManager): boolean
    {
        return input.isActionPressed(InputAction.MoveForward) ||
               input.isActionPressed(InputAction.MoveBackward) ||
               input.isActionPressed(InputAction.StrafeLeft) ||
               input.isActionPressed(InputAction.StrafeRight);
    }
}
