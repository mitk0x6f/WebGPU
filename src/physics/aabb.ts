// physics/aabb.ts

import { vec3 } from 'gl-matrix';

export class AABB
{
    public min: vec3;
    public max: vec3;

    constructor(min?: vec3, max?: vec3)
    {
        this.min = min ? vec3.clone(min) : vec3.fromValues(Infinity, Infinity, Infinity);
        this.max = max ? vec3.clone(max) : vec3.fromValues(-Infinity, -Infinity, -Infinity);
    }

    public copy(other: AABB): void
    {
        vec3.copy(this.min, other.min);
        vec3.copy(this.max, other.max);
    }

    public expandByPoint(point: vec3): void
    {
        vec3.min(this.min, this.min, point);
        vec3.max(this.max, this.max, point);
    }

    public intersects(other: AABB): boolean
    {
        return this.min[0] <= other.max[0] && this.max[0] >= other.min[0] &&
               this.min[1] <= other.max[1] && this.max[1] >= other.min[1] &&
               this.min[2] <= other.max[2] && this.max[2] >= other.min[2];
    }
}
