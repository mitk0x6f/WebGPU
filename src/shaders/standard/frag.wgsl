// shaders/standard/frag.wgsl

@group(3) @binding(0) var mySampler: sampler;
@group(3) @binding(1) var myTexture: texture_2d<f32>;

@fragment
fn main(
    @location(0) vNormal: vec3<f32>,
    @location(1) vUV: vec2<f32>,
    @location(2) vWorldPos: vec3<f32>,
    @location(3) tintColor: vec4<f32>
) -> @location(0) vec4<f32>
{
    // Custom lighting: Strong top light (1.0), bright sides (0.75), dark bottom (0.0)
    let n = normalize(vNormal);
    // Curve: f(y) = -0.25 * y^2 + 0.5 * y + 0.75
    let y = n.y;
    let lightFactor = -0.25 * y * y + 0.5 * y + 0.75;

    // Add a little bit of ambient so bottom isn't pitch black
    let finalLight = lightFactor * 0.8 + 0.2;

    let texColor = textureSample(myTexture, mySampler, vUV);

    // Apply lighting and dynamic tint
    let finalColor = texColor.rgb * finalLight * tintColor.rgb;

    // DEBUG: Visualize UVs
    // return vec4<f32>(vUV.x, vUV.y, 0.0, 1.0);
    return vec4<f32>(finalColor, texColor.a);
}
