// src/scene/character-states/character-state-id.ts

export const CharacterStateId = {
    Idle: 0,
    Walk: 1,
} as const;

export type CharacterStateId = (typeof CharacterStateId)[keyof typeof CharacterStateId];
