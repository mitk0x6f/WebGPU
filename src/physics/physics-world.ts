// physics/physics-world.ts

import { vec3, mat4 } from 'gl-matrix';
import { BoxCollider, RaycastHit } from './collider';
import type { Collider } from './collider';
import type { Ray } from './ray';
import type { Scene } from '../scene/scene';

/**
 * Minimum thickness (world units) given to perfectly-flat collision surfaces.
 * Flat quads have identical min/max Y; without padding the slab intersection degenerates.
 */
const FLAT_SURFACE_THICKNESS = 0.05;

export class PhysicsWorld
{
    private _colliders: Collider[] = [];

    // Temporary hit object used during broadphase iteration to prevent allocations.
    private readonly _tempHit = new RaycastHit();

    constructor()
    {
        // Import RaycastHit implementation
        // Since we only import the type statically above, we instantiate inline or just require it correctly
        // We can just rely on the import which now provides the class.
        // (Wait, `import type { RaycastHit } from './collider'` won't work for `new RaycastHit()`, so I must change the import in physics-world.ts! Let me do that.)
    }

    // * Registration

    /**
     * Iterates every mesh in `scene` and auto-registers a BoxCollider for each
     * one that has `collisionEnabled = true`.
     *
     * Call this **once**, after all mesh positions and scales have been set.
     * Replaces the old pattern of manually creating BoxColliders per object.
     *
     * @param scene - The scene whose meshes should be registered.
     */
    public registerScene(scene: Scene): void
    {
        // Start fresh; prevents stale colliders after scene reload
        this.clear();

        for (const mesh of scene.meshes)
        {
            if (!mesh.collisionEnabled) continue;

            this.registerMesh(mesh);
        }
    }

    /**
     * Derives a world-space `BoxCollider` from a mesh's `localBounds` and its
     * current `position` and `scale`. Rotation is not applied (AABB-only broadphase).
     *
     * For meshes that are perfectly flat (e.g. a ground quad), a minimum thickness
     * of `FLAT_SURFACE_THICKNESS` is applied downward so the ray-slab test stays stable.
     */
    public registerMesh(mesh: import('../scene/renderables/mesh').Mesh): void
    {
        if (!mesh.collisionEnabled) return;

        // Build a scale+translate matrix from the mesh's current world state.
        // (Full rotation support would require reading mesh.rotation, but for
        //  axis-aligned shapes this is sufficient for the current scene.)
        const modelMatrix = mat4.create();
        const scale = vec3.fromValues(mesh.scale[0], mesh.scale[1], mesh.scale[2]);
        const pos = vec3.fromValues(mesh.position[0], mesh.position[1], mesh.position[2]);
        mat4.fromScaling(modelMatrix, scale);
        mat4.translate(modelMatrix, modelMatrix, vec3.divide(vec3.create(), pos, scale));

        // Transform local AABB corners into world space.
        // Because we only scale+translate (no rotation), min × scale + pos is correct.
        const worldMin = vec3.fromValues(
            mesh.localBounds.min[0] * mesh.scale[0] + mesh.position[0],
            mesh.localBounds.min[1] * mesh.scale[1] + mesh.position[1],
            mesh.localBounds.min[2] * mesh.scale[2] + mesh.position[2]
        );
        const worldMax = vec3.fromValues(
            mesh.localBounds.max[0] * mesh.scale[0] + mesh.position[0],
            mesh.localBounds.max[1] * mesh.scale[1] + mesh.position[1],
            mesh.localBounds.max[2] * mesh.scale[2] + mesh.position[2]
        );

        // Ensure min <= max on every axis (handles mirrored-scale meshes).
        const boxMin = vec3.fromValues(
            Math.min(worldMin[0], worldMax[0]),
            Math.min(worldMin[1], worldMax[1]),
            Math.min(worldMin[2], worldMax[2])
        );
        const boxMax = vec3.fromValues(
            Math.max(worldMin[0], worldMax[0]),
            Math.max(worldMin[1], worldMax[1]),
            Math.max(worldMin[2], worldMax[2])
        );

        // Pad degenerate (zero-height) surfaces so the slab AABB test stays valid.
        if (Math.abs(boxMax[1] - boxMin[1]) < 0.001)
        {
            boxMin[1] -= FLAT_SURFACE_THICKNESS;
        }

        const collider = new BoxCollider(boxMin, boxMax);
        collider.updateTransform(mat4.create()); // Identity — bounds already in world space.
        this.addCollider(collider);
    }

    /**
     * Manually register an arbitrary collider (for non-mesh physics shapes such
     * as invisible barriers or trigger volumes).
     */
    public addCollider(collider: Collider): void
    {
        this._colliders.push(collider);
    }

    public removeCollider(collider: Collider): void
    {
        const index = this._colliders.indexOf(collider);

        if (index > -1)
        {
            this._colliders.splice(index, 1);
        }
    }

    /**
     * Remove all registered colliders. Called automatically by `registerScene()`.
     */
    public clear(): void
    {
        this._colliders.length = 0;
    }

    // * Queries

    /**
     * Casts `ray` against all registered colliders. If a hit is found, populates
     * `outHit` with the intersection details and returns `true`. Returns `false` otherwise.
     *
     * Broadphase: AABB rejection (cheap).
     * Narrowphase: exact OBB raycast via `Collider.raycast(..., outHit)`.
     */
    public raycast(ray: Ray, outHit: RaycastHit): boolean
    {
        let hitAnything = false;
        let minDistance = Infinity;

        for (const collider of this._colliders)
        {
            // Broadphase
            if (!ray.intersectAABB(collider.aabb)) continue;

            // Narrowphase
            if (collider.raycast(ray, this._tempHit))
            {
                if (this._tempHit.distance < minDistance)
                {
                    minDistance = this._tempHit.distance;
                    hitAnything = true;

                    vec3.copy(outHit.point, this._tempHit.point);
                    vec3.copy(outHit.normal, this._tempHit.normal);
                    outHit.distance = this._tempHit.distance;
                    outHit.collider = this._tempHit.collider;
                }
            }
        }

        return hitAnything;
    }
}
