// shaders/cube/vert.wgsl

@group(2) @binding(0) var<uniform> modelMatrix : mat4x4<f32>;
@group(1) @binding(0) var<uniform> viewProjMatrix : mat4x4<f32>;

struct VertexOut {
    @builtin(position) Position : vec4<f32>,
    @location(0) vNormal : vec3<f32>,
    @location(1) vUV     : vec2<f32>
};

@vertex
fn main(
    @location(0) position : vec3<f32>,
    @location(1) normal   : vec3<f32>,
    @location(2) uv       : vec2<f32>
) -> VertexOut {
    var out: VertexOut;

    // model then view-proj (column-major, gl-matrix matches WGSL)
    let worldPos = modelMatrix * vec4<f32>(position, 1.0);
    out.Position = viewProjMatrix * worldPos;

    // transform normal by model (w = 0 so translation ignored).
    out.vNormal = (modelMatrix * vec4<f32>(normal, 0.0)).xyz;
    out.vUV = uv;

    return out;
}