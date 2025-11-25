// shaders/cube/frag.wgsl

@fragment
fn main(
    @location(0) vNormal: vec3<f32>,
    @location(1) vUV: vec2<f32>,
    @location(2) vWorldPos: vec3<f32>
) -> @location(0) vec4<f32>
{
    // TODO: Pass water height as a uniform or make it always 0.0

    // Water clipping: discard fragments below the water surface
    let waterHeight = -0.5; // Water surface Y position

    if (vWorldPos.y < waterHeight)
    {
        discard;
    }

    let n = normalize(vNormal);
    // Custom lighting: Evenly distributed from top/sides, dark on bottom
    // n.y is 1.0 at top, 0.0 at sides, -1.0 at bottom

    // smoothstep(-0.5, 0.0, n.y) maps:
    // < -0.5 (bottom) -> 0.0
    // 0.0 (sides) -> 1.0
    // > 0.0 (top) -> 1.0
    let lightFactor = smoothstep(-0.5, 0.0, n.y);

    // Add a little bit of ambient so bottom isn't pitch black
    let finalLight = lightFactor * 0.8 + 0.2;

    // Use UV to tint the result so you can see UVs (debug)
    let base = vec3<f32>(vUV.x, vUV.y, 1.0) * 0.8;

    // final color
    let color = base * finalLight;
    return vec4<f32>(color, 1.0);
}