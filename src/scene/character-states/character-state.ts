// src/scene/character-states/character-state.ts

import type { Character } from '../character';
import type { InputManager } from '../../core/input-manager';
import type { PhysicsWorld } from '../../physics/physics-world';
import type { CharacterStateId } from './character-state-id';

export interface ICharacterState
{
    readonly id: CharacterStateId;

    /**
     * Called when the state machine transitions into this state.
     */
    enter(character: Character): void;

    /**
     * Called every frame to run the state's logic.
     * @returns The ID of the state that should be executed next frame.
     *          If it returns its own ID, no transition occurs.
     */
    update(character: Character, dt: number, input: InputManager, physics: PhysicsWorld): CharacterStateId;

    /**
     * Called when the state machine transitions out of this state.
     */
    exit(character: Character): void;
}
