// shaders/water/vert.wgsl

// groups: 0 = frame, 1 = scene(viewProj+cameraPos), 2 = model (mat4 + scale), 3 = material (displacement texture + materialUB)

@group(0) @binding(0) var<uniform> uFrame: vec4<f32>;

struct SceneUniform
{
    viewProj: mat4x4<f32>,
    cameraPos: vec4<f32>
};

@group(1) @binding(0) var<uniform> uScene: SceneUniform;

struct ModelUniform
{
    model: mat4x4<f32>,
    scale: vec4<f32>, // scale.xyz used by shader; w unused
};

@group(2) @binding(0) var<uniform> uModel: ModelUniform;
// Displacement texture (read from vertex stage via textureLoad — no sampler)
@group(3) @binding(3) var displacementMap: texture_2d<f32>;
// material uniform: uvScaleX, uvScaleY, roughnessFactor, dispScale
@group(3) @binding(6) var<uniform> uMaterial: vec4<f32>;

struct VertexOut
{
    @builtin(position) Position: vec4<f32>,
    @location(0) vNormal: vec3<f32>,
    @location(1) vUV: vec2<f32>,
    @location(2) vWorldPos: vec3<f32>,
    @location(3) vViewDir: vec3<f32>,
    @location(4) vClipPos: vec4<f32>
};

@vertex
fn main(
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>
) -> VertexOut
{
    var out: VertexOut;

    // Flat water, no waves
    let pos = position;

    // Compute tiled UV
    let uvScale = vec2<f32>(uMaterial.x, uMaterial.y);
    let uvTiled = uv * uvScale;

    let worldPos4 = uModel.model * vec4<f32>(pos, 1.0);
    out.Position = uScene.viewProj * worldPos4;
    out.vClipPos = out.Position;

    // Normal is just up for flat water
    let n = vec3<f32>(0.0, 1.0, 0.0);

    out.vNormal = normalize((uModel.model * vec4<f32>(n, 0.0)).xyz);
    out.vUV = uvTiled;
    out.vWorldPos = worldPos4.xyz;
    out.vViewDir = normalize(uScene.cameraPos.xyz - out.vWorldPos);

    return out;
}
