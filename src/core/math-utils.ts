// core/math-utils.ts

/**
 * Linearly interpolates between two angles in degrees, ensuring it takes the shortest path.
 * Formula: (end - start + 540) % 360 - 180
 *
 * @param start - Starting angle in degrees
 * @param end - Target angle in degrees
 * @param t - Interpolation factor (0 to 1)
 * @returns The interpolated angle in degrees
 */
export function lerpAngle(start: number, end: number, t: number): number
{
    const diff = (((end - start) % 360) + 540) % 360 - 180;

    return start + diff * t;
}
