// core/bindgroup-indices.ts

export const BindGroupIndex = {
    /**
     * @enum {number} BindGroupIndex
     *
     * @description Index constants for WebGPU bind groups.
     *
     * @property {number} Frame    - @index 0: Per-frame data:    @time                 @resolution       @frameCount
     * @property {number} Scene    - @index 1: Per-scene data:    @cameraViewProjection @skybox           @lighting         @shadows
     * @property {number} Model    - @index 2: Per-object data:   @modelMatrix          @skinning
     * @property {number} Material - @index 3: Per-material data: @sampler              @textures         @materialUniforms
     */

    Frame: 0,
    Scene: 1,
    Model: 2,
    Material: 3
} as const;

export type BindGroupIndex = typeof BindGroupIndex[keyof typeof BindGroupIndex];