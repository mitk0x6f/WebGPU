// shaders/water/vert.wgsl
// Vertex shader (displacement via textureLoad in vertex stage)
// groups: 0 = frame, 1 = scene(viewProj+cameraPos), 2 = model (mat4 + scale), 3 = material (displacement texture + materialUB)

@group(0) @binding(0) var<uniform> uFrame : vec4<f32>;

struct SceneUniform {
    viewProj : mat4x4<f32>,
    cameraPos: vec4<f32>,
};
@group(1) @binding(0) var<uniform> uScene : SceneUniform;

struct ModelUniform {
    model : mat4x4<f32>,
    scale : vec4<f32>, // scale.xyz used by shader; w unused
};
@group(2) @binding(0) var<uniform> uModel : ModelUniform;

// Displacement texture (read from vertex stage via textureLoad — no sampler)
@group(3) @binding(3) var displacementMap : texture_2d<f32>;
// material uniform: uvScaleX, uvScaleY, roughnessFactor, dispScale
@group(3) @binding(6) var<uniform> uMaterial : vec4<f32>;

struct VertexOut {
    @builtin(position) Position : vec4<f32>,
    @location(0) vNormal : vec3<f32>,
    @location(1) vUV     : vec2<f32>,
    @location(2) vWorldPos : vec3<f32>,
    @location(3) vViewDir  : vec3<f32>,
};

@vertex
fn main(
    @location(0) position : vec3<f32>,
    @location(1) normal   : vec3<f32>,
    @location(2) uv       : vec2<f32>
) -> VertexOut {
    var out: VertexOut;

    let uTime: f32 = uFrame.x;

    // --- analytic wave layers ---
    let TWO_PI: f32 = 6.283185307179586;
    let dirA = normalize(vec2<f32>(1.0, 0.2));
    let dirB = normalize(vec2<f32>(0.3, 1.0));
    let dirC = normalize(vec2<f32>(-0.8, 0.5));

    let ampA = 0.03;
    let ampB = 0.018;
    let ampC = 0.01;

    let lambdaA = 0.45;
    let lambdaB = 0.28;
    let lambdaC = 0.14;

    let speedA = 1.6;
    let speedB = 1.1;
    let speedC = 2.0;

    // compensate for model scale (so wave frequency appears same regardless of mesh scaling)
    let invScaleXZ = vec2<f32>(1.0 / max(uModel.scale.x, 0.0001), 1.0 / max(uModel.scale.z, 0.0001));
    let xz = vec2<f32>(position.x, position.z) * invScaleXZ;

    let kA = TWO_PI / lambdaA;
    let kB = TWO_PI / lambdaB;
    let kC = TWO_PI / lambdaC;

    let qA = kA * dot(dirA, xz) + speedA * uTime;
    let qB = kB * dot(dirB, xz) + speedB * uTime;
    let qC = kC * dot(dirC, xz) + speedC * uTime;

    let hA = ampA * sin(qA);
    let hB = ampB * sin(qB);
    let hC = ampC * sin(qC);

    // apply analytic wave displacement
    var pos = position;
    pos.y += hA + hB + hC;

    // --- displacement map sampling in vertex stage using textureLoad (unfiltered) ---
    // compute tiled UV from material uniform
    let uvScale = vec2<f32>(uMaterial.x, uMaterial.y);
    let uvTiled = uv * uvScale;

    // textureDimensions may return u32 components on some drivers; convert to i32 for integer coords math
    let dims_u = textureDimensions(displacementMap, 0); // vec2<u32>
    let dims = vec2<i32>(i32(dims_u.x), i32(dims_u.y)); // convert to vec2<i32>

    // get floating texel coords and convert to integer texel coords
    let texF = uvTiled * vec2<f32>(f32(dims.x), f32(dims.y));
    var texCoord = vec2<i32>(i32(floor(texF.x)), i32(floor(texF.y)));

    // clamp texCoord to [0 .. dims-1] safely (both sides are i32 now)
    let maxCoord = dims - vec2<i32>(1, 1);
    texCoord = clamp(texCoord, vec2<i32>(0, 0), maxCoord);

    // read texel (level 0). result is vec4<f32>.
    let dispSample = textureLoad(displacementMap, texCoord, 0);
    let disp = dispSample.r * uMaterial.w; // uMaterial.w == dispScale

    pos.y += disp;

    // analytic normal from wave derivatives (only waves; normalmap blending happens in fragment)
    let dhdx = ampA * kA * dirA.x * cos(qA)
             + ampB * kB * dirB.x * cos(qB)
             + ampC * kC * dirC.x * cos(qC);

    let dhdz = ampA * kA * dirA.y * cos(qA)
             + ampB * kB * dirB.y * cos(qB)
             + ampC * kC * dirC.y * cos(qC);

    var n = normalize(vec3<f32>(-dhdx, 1.0, -dhdz));

    let worldPos4 = uModel.model * vec4<f32>(pos, 1.0);
    out.Position = uScene.viewProj * worldPos4;

    out.vNormal = normalize((uModel.model * vec4<f32>(n, 0.0)).xyz);
    out.vUV = uvTiled;
    out.vWorldPos = worldPos4.xyz;
    out.vViewDir = normalize(uScene.cameraPos.xyz - out.vWorldPos);

    return out;
}
