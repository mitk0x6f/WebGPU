// src/scene/character-states/walk-state.ts

import type { Character } from '../character';
import type { InputManager } from '../../core/input-manager';
import type { PhysicsWorld } from '../../physics/physics-world';
import { CharacterStateId } from './character-state-id';
import type { ICharacterState } from './character-state';

export class WalkState implements ICharacterState
{
    public readonly id = CharacterStateId.Walk;

    public enter(_character: Character): void
    {
        // Walk initialization (e.g. blend in walk animation eventually)
    }

    public update(character: Character, dt: number, input: InputManager, physics: PhysicsWorld): CharacterStateId
    {
        // Apply rotation
        character.handleRotation(dt, input);

        // Apply movement physics and evaluate if character is still moving
        const hasMoved = character.handleMovement(dt, input, physics);

        // If no movement was applied due to lack of input, transition back to Idle
        if (!hasMoved) return CharacterStateId.Idle;

        return this.id;
    }

    public exit(character: Character): void
    {
        // Reset velocity just to be safe
        character.clearVelocity();
    }
}
