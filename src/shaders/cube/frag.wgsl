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
    // Custom lighting: Strong top light (1.0), bright sides (0.75), dark bottom (0.0)
    // Curve: f(y) = -0.25 * y^2 + 0.5 * y + 0.75
    let y = n.y;
    let lightFactor = -0.25 * y * y + 0.5 * y + 0.75;

    // Add a little bit of ambient so bottom isn't pitch black, but keep contrast
    // Range becomes [0.2, 1.0]
    let finalLight = lightFactor * 0.8 + 0.2;

    // Use UV to tint the result so you can see UVs (debug)
    let base = vec3<f32>(vUV.x, vUV.y, 1.0) * 0.8;

    // final color
    let color = base * finalLight;

    return vec4<f32>(color, 1.0);
}