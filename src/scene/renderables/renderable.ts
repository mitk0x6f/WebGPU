// renderables/renderable.ts

import { vec3 } from "gl-matrix";

export abstract class Renderable
{
    public abstract type: 'mesh' | 'light' | 'skybox';
    public name: string = ''; // TODO: Make the water a separate class, so we can omit Renderable.name
    public groupId?: number; // Optional group identifier for categorization
    public position: Float32Array = new Float32Array(vec3.create());
    public rotation: Float32Array = new Float32Array(vec3.create());
    public scale: Float32Array = new Float32Array(vec3.fromValues(1, 1, 1));
    public visible = true;

    abstract bind(pass: GPURenderPassEncoder): void;
    abstract destroy(): void;
}