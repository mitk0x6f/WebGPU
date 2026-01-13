// core/math-constants.ts

/**
 * Pre-calculated mathematical constants for performance optimization.
 *
 * These constants are computed at build time to avoid repeated runtime calculations,
 * particularly in performance-critical code paths like animation loops and frame updates.
 */

/**
 * Conversion factor from degrees to radians.
 * Equivalent to: Math.PI / 180
 *
 * Usage: `const radians = degrees * DEG_TO_RAD;`
 */
export const DEG_TO_RAD = Math.PI / 180;

/**
 * Conversion factor from radians to degrees.
 * Equivalent to: 180 / Math.PI
 *
 * Usage: `const degrees = radians * RAD_TO_DEG;`
 */
export const RAD_TO_DEG = 180 / Math.PI;
