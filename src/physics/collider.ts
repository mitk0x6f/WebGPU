// physics/collider.ts

import { vec3, mat4 } from 'gl-matrix';
import { AABB } from './aabb';
import { Ray } from './ray';

export class RaycastHit
{
    public point: vec3 = vec3.create();
    public normal: vec3 = vec3.create();
    public distance: number = 0;
    public collider: Collider | null = null;
}

export abstract class Collider
{
    public aabb: AABB;
    public transform: mat4;

    constructor()
    {
        this.aabb = new AABB();
        this.transform = mat4.create();
    }

    public abstract updateTransform(modelMatrix: mat4): void;
    public abstract raycast(ray: Ray, outHit: RaycastHit): boolean;
}

export class BoxCollider extends Collider
{
    private _localMin: vec3;
    private _localMax: vec3;

    // * Static scratchpads for zero-allocation raycasts (Javascript is single-threaded)
    private static readonly _invTransform = mat4.create();
    private static readonly _localOrigin = vec3.create();
    private static readonly _localDirection = vec3.create();
    private static readonly _p2 = vec3.create();
    private static readonly _localRay = new Ray(vec3.create(), vec3.create());
    private static readonly _localAABB = new AABB();
    private static readonly _localHitPoint = vec3.create();
    private static readonly _normalMatrix = mat4.create();

    constructor(min: vec3, max: vec3)
    {
        super();
        this._localMin = vec3.clone(min);
        this._localMax = vec3.clone(max);
        this.updateAABB();
    }

    private updateAABB(): void
    {
        const corners = [
            vec3.fromValues(this._localMin[0], this._localMin[1], this._localMin[2]),
            vec3.fromValues(this._localMax[0], this._localMin[1], this._localMin[2]),
            vec3.fromValues(this._localMin[0], this._localMax[1], this._localMin[2]),
            vec3.fromValues(this._localMax[0], this._localMax[1], this._localMin[2]),
            vec3.fromValues(this._localMin[0], this._localMin[1], this._localMax[2]),
            vec3.fromValues(this._localMax[0], this._localMin[1], this._localMax[2]),
            vec3.fromValues(this._localMin[0], this._localMax[1], this._localMax[2]),
            vec3.fromValues(this._localMax[0], this._localMax[1], this._localMax[2]),
        ];

        this.aabb.min = vec3.fromValues(Infinity, Infinity, Infinity);
        this.aabb.max = vec3.fromValues(-Infinity, -Infinity, -Infinity);

        for (const corner of corners)
        {
            vec3.transformMat4(corner, corner, this.transform);
            this.aabb.expandByPoint(corner);
        }
    }

    public updateTransform(modelMatrix: mat4): void
    {
        mat4.copy(this.transform, modelMatrix);
        this.updateAABB();
    }

    public raycast(ray: Ray, outHit: RaycastHit): boolean
    {
        // For a BoxCollider, we should transform the ray into local space,
        // intersect with the local AABB, and then transform the intersection back to world space.
        const invTransform = BoxCollider._invTransform;
        mat4.invert(invTransform, this.transform);

        const localOrigin = BoxCollider._localOrigin;
        const localDirection = BoxCollider._localDirection;

        vec3.transformMat4(localOrigin, ray.origin, invTransform);

        // Direction needs only rotation/scale, not translation.
        const p2 = BoxCollider._p2;
        vec3.add(p2, ray.origin, ray.direction);
        vec3.transformMat4(p2, p2, invTransform);
        vec3.sub(localDirection, p2, localOrigin);
        vec3.normalize(localDirection, localDirection);

        const localRay = BoxCollider._localRay;
        vec3.copy(localRay.origin, localOrigin);
        vec3.copy(localRay.direction, localDirection);

        // Intersect local Ray with local AABB
        const localAABB = BoxCollider._localAABB;
        vec3.copy(localAABB.min, this._localMin);
        vec3.copy(localAABB.max, this._localMax);

        // Basic AABB raycast returning t and normal
        let tmin = (localAABB.min[0] - localRay.origin[0]) / localRay.direction[0];
        let tmax = (localAABB.max[0] - localRay.origin[0]) / localRay.direction[0];
        let normalMinX = -1, normalMinY = 0, normalMinZ = 0;

        if (tmin > tmax) { const temp = tmin; tmin = tmax; tmax = temp; normalMinX = 1; }

        let tymin = (localAABB.min[1] - localRay.origin[1]) / localRay.direction[1];
        let tymax = (localAABB.max[1] - localRay.origin[1]) / localRay.direction[1];
        let normalYMinX = 0, normalYMinY = -1, normalYMinZ = 0;

        if (tymin > tymax) { const temp = tymin; tymin = tymax; tymax = temp; normalYMinY = 1; }

        let tNear = tmin;
        let tFar = tmax;
        let normalNearX = normalMinX, normalNearY = normalMinY, normalNearZ = normalMinZ;

        if ((tNear > tymax) || (tymin > tFar)) return false;

        if (tymin > tNear) { tNear = tymin; normalNearX = normalYMinX; normalNearY = normalYMinY; normalNearZ = normalYMinZ; }
        if (tymax < tFar) tFar = tymax;

        let tzmin = (localAABB.min[2] - localRay.origin[2]) / localRay.direction[2];
        let tzmax = (localAABB.max[2] - localRay.origin[2]) / localRay.direction[2];
        let normalZMinX = 0, normalZMinY = 0, normalZMinZ = -1;

        if (tzmin > tzmax) { const temp = tzmin; tzmin = tzmax; tzmax = temp; normalZMinZ = 1; }

        if ((tNear > tzmax) || (tzmin > tFar)) return false;

        if (tzmin > tNear) { tNear = tzmin; normalNearX = normalZMinX; normalNearY = normalZMinY; normalNearZ = normalZMinZ; }
        if (tzmax < tFar) tFar = tzmax;

        if (tFar < 0) return false; // Box is behind ray

        const t = tNear >= 0 ? tNear : tFar; // if tNear < 0, origin is inside the box

        const localHitPoint = BoxCollider._localHitPoint;
        vec3.scale(localHitPoint, localRay.direction, t);
        vec3.add(localHitPoint, localRay.origin, localHitPoint);

        vec3.transformMat4(outHit.point, localHitPoint, this.transform);

        const normalMatrix = BoxCollider._normalMatrix;
        mat4.invert(normalMatrix, this.transform);
        mat4.transpose(normalMatrix, normalMatrix);

        // Put the scalar normal into outHit.normal temporarily to transform it
        vec3.set(outHit.normal, normalNearX, normalNearY, normalNearZ);
        vec3.transformMat4(outHit.normal, outHit.normal, normalMatrix);
        vec3.normalize(outHit.normal, outHit.normal);

        outHit.distance = vec3.distance(ray.origin, outHit.point);
        outHit.collider = this;

        return true;
    }
}
