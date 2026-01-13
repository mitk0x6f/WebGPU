// scene/renderables/group-manager.ts

import type { Renderable } from './renderable';

/**
 * GroupManager provides efficient group-based operations on renderables.
 * Designed simple for easier migration to ECS at a later stage.
 */
export class GroupManager
{
    private _groups: Map<number, Set<Renderable>> = new Map();

    assign(renderable: Renderable, groupId: number): void
    {
        renderable.groupId = groupId;

        // Add to group index
        if (!this._groups.has(groupId))
        {
            this._groups.set(groupId, new Set());
        }

        this._groups.get(groupId)!.add(renderable);
    }

    unassign(renderable: Renderable): void
    {
        if (renderable.groupId === undefined) return;

        const group = this._groups.get(renderable.groupId);

        if (group)
        {
            group.delete(renderable);

            if (group.size === 0)
            {
                this._groups.delete(renderable.groupId);
            }
        }

        renderable.groupId = undefined;
    }

    getGroup(groupId: number): Renderable[]
    {
        const group = this._groups.get(groupId);

        return group ? Array.from(group) : [];
    }

    hasGroup(groupId: number): boolean
    {
        return this._groups.has(groupId) && this._groups.get(groupId)!.size > 0;
    }

    setGroupVisibility(groupId: number, visible: boolean): void
    {
        const group = this._groups.get(groupId);

        if (group)
        {
            for (const renderable of group)
            {
                renderable.visible = visible;
            }
        }
    }

    clear(): void
    {
        this._groups.clear();
    }
}
