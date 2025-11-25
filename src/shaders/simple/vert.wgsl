struct FrameUniforms
{
    time: f32,
    frame: f32,
    resolution: vec2<f32>
};

@group(0) @binding(0)
var<uniform> frame: FrameUniforms;

// Declare other uniforms similarly:
struct SceneUniforms
{
    viewProj: mat4x4<f32>
};

@group(1) @binding(0)
var<uniform> scene: SceneUniforms;

struct ModelUniforms
{
    model: mat4x4<f32>
};

@group(2) @binding(0)
var<uniform> model: ModelUniforms;

struct VertexInput
{
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>
};

struct VertexOutput
{
    @builtin(position) Position: vec4<f32>,
    @location(0) fragNormal: vec3<f32>,
    @location(1) fragUV: vec2<f32>
};

@vertex
fn main(input: VertexInput) -> VertexOutput
{
    var output: VertexOutput;
    let worldPos = model.model * vec4<f32>(input.position, 1.0);
    let normalMatrix = mat3x3<f32>(
        model.model[0].xyz,
        model.model[1].xyz,
        model.model[2].xyz
    );

    output.Position = scene.viewProj * worldPos;
    output.fragNormal = normalize(normalMatrix * input.normal);
    output.fragUV = input.uv;

    return output;
}
