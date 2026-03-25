// physics/ray.ts

import { vec3 } from 'gl-matrix';
import { AABB } from './aabb';

export class Ray
{
    public origin: vec3;
    public direction: vec3;

    constructor(origin: vec3, direction: vec3)
    {
        this.origin = vec3.clone(origin);
        this.direction = vec3.clone(direction);
        vec3.normalize(this.direction, this.direction);
    }

    // Möller–Trumbore ray-triangle intersection algorithm
    public intersectTriangle(v0: vec3, v1: vec3, v2: vec3, outIntersectionPoint: vec3 | null, outNormal: vec3 | null): number | null
    {
        const EPSILON = 0.0000001;
        const edge1 = vec3.create();
        const edge2 = vec3.create();
        const h = vec3.create();
        const s = vec3.create();
        const q = vec3.create();

        vec3.sub(edge1, v1, v0);
        vec3.sub(edge2, v2, v0);
        vec3.cross(h, this.direction, edge2);

        const a = vec3.dot(edge1, h);

        if (a > -EPSILON && a < EPSILON) return null; // Ray is parallel to the triangle

        const f = 1.0 / a;
        vec3.sub(s, this.origin, v0);
        const u = f * vec3.dot(s, h);

        if (u < 0.0 || u > 1.0) return null;

        vec3.cross(q, s, edge1);
        const v = f * vec3.dot(this.direction, q);

        if (v < 0.0 || u + v > 1.0) return null;

        const t = f * vec3.dot(edge2, q);

        if (t > EPSILON)
        {
            if (outIntersectionPoint)
            {
                vec3.scale(outIntersectionPoint, this.direction, t);
                vec3.add(outIntersectionPoint, this.origin, outIntersectionPoint);
            }

            if (outNormal)
            {
                vec3.cross(outNormal, edge1, edge2);
                vec3.normalize(outNormal, outNormal);

                // Ensure normal faces against ray
                if (vec3.dot(outNormal, this.direction) > 0)
                {
                    vec3.scale(outNormal, outNormal, -1);
                }
            }
            return t;
        }
        else
        {
            return null; // intersection behind origin
        }
    }

    public intersectAABB(aabb: AABB): boolean
    {
        let tmin = (aabb.min[0] - this.origin[0]) / this.direction[0];
        let tmax = (aabb.max[0] - this.origin[0]) / this.direction[0];

        if (tmin > tmax) { const temp = tmin; tmin = tmax; tmax = temp; }

        let tymin = (aabb.min[1] - this.origin[1]) / this.direction[1];
        let tymax = (aabb.max[1] - this.origin[1]) / this.direction[1];

        if (tymin > tymax) { const temp = tymin; tymin = tymax; tymax = temp; }

        if ((tmin > tymax) || (tymin > tmax)) return false;

        if (tymin > tmin) tmin = tymin;
        if (tymax < tmax) tmax = tymax;

        let tzmin = (aabb.min[2] - this.origin[2]) / this.direction[2];
        let tzmax = (aabb.max[2] - this.origin[2]) / this.direction[2];

        if (tzmin > tzmax) { const temp = tzmin; tzmin = tzmax; tzmax = temp; }

        if ((tmin > tzmax) || (tzmin > tmax)) return false;

        if (tzmin > tmin) tmin = tzmin;
        if (tzmax < tmax) tmax = tzmax;

        return tmax > 0;
    }
}
