// Skybox fragment shader - samples cube map from the Scene bind group

@group(1) @binding(1) var skySampler : sampler;
@group(1) @binding(2) var skyCube : texture_cube<f32>;

struct FragmentInput {
    @location(0) vDir : vec3<f32>
};

@fragment
fn main(in: FragmentInput) -> @location(0) vec4<f32> {
    // sample by direction
    let color = textureSample(skyCube, skySampler, in.vDir);
    return vec4<f32>(color.rgb, 1.0);
}
