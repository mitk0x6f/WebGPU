// Skybox vertex shader
// group1 = scene (viewProj, cameraPos)  group2 = model (model matrix)

struct SceneUniform {
    viewProj : mat4x4<f32>,
    cameraPos: vec4<f32>
};
@group(1) @binding(0) var<uniform> uScene : SceneUniform;
@group(2) @binding(0) var<uniform> uModel : mat4x4<f32>;

struct VertexOut {
    @builtin(position) Position : vec4<f32>,
    @location(0) vDir : vec3<f32>
};

@vertex
fn main(
    @location(0) position : vec3<f32>
) -> VertexOut {
    var out: VertexOut;

    // world position = model * position (we set model translation to camera pos)
    let worldPos = (uModel * vec4<f32>(position, 1.0)).xyz;

    // direction from camera to vertex (use for cubemap sampling)
    out.vDir = normalize(worldPos - uScene.cameraPos.xyz);

    // transform to clip-space normally
    out.Position = uScene.viewProj * vec4<f32>(worldPos, 1.0);

    return out;
}
