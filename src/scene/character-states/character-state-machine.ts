// src/scene/character-states/character-state-machine.ts

import type { Character } from '../character';
import type { InputManager } from '../../core/input-manager';
import type { PhysicsWorld } from '../../physics/physics-world';
import { CharacterStateId } from './character-state-id';
import type { ICharacterState } from './character-state';

export class CharacterStateMachine
{
    private _currentState!: ICharacterState;
    private readonly _states: Map<CharacterStateId, ICharacterState> = new Map();
    private readonly _character: Character;

    constructor(character: Character)
    {
        this._character = character;
    }

    /**
     * Registers a pre-allocated state to the state machine.
     * Guaranteed zero-allocation during gameplay.
     */
    public registerState(state: ICharacterState): void
    {
        this._states.set(state.id, state);
    }

    /**
     * Starts the state machine with an initial state.
     */
    public start(initialStateId: CharacterStateId): void
    {
        const state = this._states.get(initialStateId);

        if (!state) throw new Error(`State ${initialStateId} not found`);

        this._currentState = state;
        this._currentState.enter(this._character);
    }

    /**
     * Executes the current state's logic. Transitions if the state returns a different ID.
     */
    public update(dt: number, input: InputManager, physics: PhysicsWorld): void
    {
        if (!this._currentState) return;

        const nextStateId = this._currentState.update(this._character, dt, input, physics);

        if (nextStateId !== this._currentState.id) this._transitionTo(nextStateId);
    }

    private _transitionTo(nextStateId: CharacterStateId): void
    {
        const nextState = this._states.get(nextStateId);

        if (!nextState) throw new Error(`State ${nextStateId} not found`);

        this._currentState.exit(this._character);
        this._currentState = nextState;
        this._currentState.enter(this._character);
    }

    public get currentStateId(): CharacterStateId
    {
        return this._currentState.id;
    }
}
