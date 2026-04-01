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

    /**
     * Casts a ray against the collider. If a radius > 0 is provided,
     * performs a volumetric sphere sweep (Minkowski expansion constraint).
     */
    public abstract raycast(ray: Ray, maxDistance: number, outHit: RaycastHit, radius?: number): boolean;
    public abstract updateTransform(modelMatrix: mat4): void;
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

    public raycast(ray: Ray, maxDistance: number, outHit: RaycastHit, radius: number = 0): boolean
    {
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

        const localAABB = BoxCollider._localAABB;

        if (radius > 0)
        {
            // Calculate local radius (Minkowski expansion) by factoring out transform scale
            // scale is length of column vectors in the matrix
            const t = this.transform;
            const sx = Math.sqrt(t[0]*t[0] + t[1]*t[1] + t[2]*t[2]);
            const sy = Math.sqrt(t[4]*t[4] + t[5]*t[5] + t[6]*t[6]);
            const sz = Math.sqrt(t[8]*t[8] + t[9]*t[9] + t[10]*t[10]);

            // Inflate local AABB by the local radius
            vec3.set(localAABB.min, this._localMin[0] - (radius / sx), this._localMin[1] - (radius / sy), this._localMin[2] - (radius / sz));
            vec3.set(localAABB.max, this._localMax[0] + (radius / sx), this._localMax[1] + (radius / sy), this._localMax[2] + (radius / sz));
        }
        else
        {
            vec3.copy(localAABB.min, this._localMin);
            vec3.copy(localAABB.max, this._localMax);
        }

        // Basic AABB raycast returning t and normal
        let tmin = (localAABB.min[0] - localRay.origin[0]) / localRay.direction[0];
        let tmax = (localAABB.max[0] - localRay.origin[0]) / localRay.direction[0];
        let normalMinX = -1, normalMinY = 0, normalMinZ = 0;

        if (tmin > tmax)
        {
            const temp = tmin;
            tmin = tmax;
            tmax = temp;
            normalMinX = 1;
        }

        let tymin = (localAABB.min[1] - localRay.origin[1]) / localRay.direction[1];
        let tymax = (localAABB.max[1] - localRay.origin[1]) / localRay.direction[1];
        let normalYMinX = 0, normalYMinY = -1, normalYMinZ = 0;

        if (tymin > tymax)
        {
            const temp = tymin;
            tymin = tymax;
            tymax = temp;
            normalYMinY = 1;
        }

        let tNear = tmin;
        let tFar = tmax;
        let normalNearX = normalMinX, normalNearY = normalMinY, normalNearZ = normalMinZ;

        if ((tNear > tymax) || (tymin > tFar)) return false;

        if (tymin > tNear)
        {
            tNear = tymin;
            normalNearX = normalYMinX;
            normalNearY = normalYMinY;
            normalNearZ = normalYMinZ;
        }

        if (tymax < tFar) tFar = tymax;

        let tzmin = (localAABB.min[2] - localRay.origin[2]) / localRay.direction[2];
        let tzmax = (localAABB.max[2] - localRay.origin[2]) / localRay.direction[2];
        let normalZMinX = 0, normalZMinY = 0, normalZMinZ = -1;

        if (tzmin > tzmax)
        {
            const temp = tzmin;
            tzmin = tzmax;
            tzmax = temp;
            normalZMinZ = 1;
        }

        if ((tNear > tzmax) || (tzmin > tFar)) return false;

        if (tzmin > tNear)
        {
            tNear = tzmin;
            normalNearX = normalZMinX;
            normalNearY = normalZMinY;
            normalNearZ = normalZMinZ;
        }

        if (tzmax < tFar) tFar = tzmax;

        // Box is behind ray
        if (tFar < 0) return false;

        let tHit: number;

        if (tNear < 0)
        {
            // Ray origin is inside the box locally. Find closest face.
            let minDistToFace = Infinity;
            const dxMin = Math.abs(localRay.origin[0] - localAABB.min[0]);
            const dxMax = Math.abs(localRay.origin[0] - localAABB.max[0]);
            const dyMin = Math.abs(localRay.origin[1] - localAABB.min[1]);
            const dyMax = Math.abs(localRay.origin[1] - localAABB.max[1]);
            const dzMin = Math.abs(localRay.origin[2] - localAABB.min[2]);
            const dzMax = Math.abs(localRay.origin[2] - localAABB.max[2]);

            if (dxMin < minDistToFace) { minDistToFace = dxMin; normalNearX = -1; normalNearY = 0; normalNearZ = 0; }
            if (dxMax < minDistToFace) { minDistToFace = dxMax; normalNearX = 1; normalNearY = 0; normalNearZ = 0; }
            if (dyMin < minDistToFace) { minDistToFace = dyMin; normalNearX = 0; normalNearY = -1; normalNearZ = 0; }
            if (dyMax < minDistToFace) { minDistToFace = dyMax; normalNearX = 0; normalNearY = 1; normalNearZ = 0; }
            if (dzMin < minDistToFace) { minDistToFace = dzMin; normalNearX = 0; normalNearY = 0; normalNearZ = -1; }
            if (dzMax < minDistToFace) { minDistToFace = dzMax; normalNearX = 0; normalNearY = 0; normalNearZ = 1; }

            // If we are moving outwards via the closest face, ignore the hit.
            const dot = localRay.direction[0] * normalNearX + localRay.direction[1] * normalNearY + localRay.direction[2] * normalNearZ;

            if (dot > 0.001) return false;

            tHit = 0;
        }
        else
        {
            tHit = tNear;
        }

        if (tHit > maxDistance) return false;

        const localHitPoint = BoxCollider._localHitPoint;
        vec3.scale(localHitPoint, localRay.direction, tHit);
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
