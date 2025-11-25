struct FrameUniforms
{
    time: f32,
    frame: f32,
    resolution: vec2<f32>
};

@group(0) @binding(0)
var<uniform> frame: FrameUniforms;

@group(3) @binding(0)
var sampler0: sampler;

@group(3) @binding(1)
var texture0: texture_2d<f32>;

struct FragmentInput
{
    @location(0) fragNormal: vec3<f32>,
    @location(1) fragUV: vec2<f32>
};

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32>
{
    let lightDir = normalize(vec3<f32>(0.5, 0.7, 1.0));
    let normal = normalize(input.fragNormal);

    let diff = max(dot(normal, lightDir), 0.0);
    let baseColor = textureSample(texture0, sampler0, input.fragUV).rgb;

    let ambient = 0.2;
    let color = baseColor * (ambient + diff);

    return vec4<f32>(color, 1.0);
}
