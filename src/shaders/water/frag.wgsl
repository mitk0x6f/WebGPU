// shaders/water/frag.wgsl
// Fragment shader: filtered samples for color/normal/ao/roughness + shading
// groups: 0 = frame, 1 = scene, 3 = material (sampler + textures + UB)

@group(0) @binding(0) var<uniform> uFrame : vec4<f32>;

struct SceneUniform {
    viewProj : mat4x4<f32>,
    cameraPos: vec4<f32>,
};
@group(1) @binding(0) var<uniform> uScene : SceneUniform;

// Material bindings
@group(3) @binding(0) var samp : sampler; // fragment-only sampler
@group(3) @binding(1) var baseColorTex : texture_2d<f32>;
@group(3) @binding(2) var normalMapTex : texture_2d<f32>;
@group(3) @binding(3) var displacementMapTex : texture_2d<f32>; // bound but not sampled here
@group(3) @binding(4) var aoTex : texture_2d<f32>;
@group(3) @binding(5) var roughnessTex : texture_2d<f32>;
// material uniform: uvScaleX, uvScaleY, roughnessFactor, dispScale
@group(3) @binding(6) var<uniform> uMaterial : vec4<f32>;

struct FragmentInput {
    @location(0) vNormal : vec3<f32>,
    @location(1) vUV     : vec2<f32>,
    @location(2) vWorldPos : vec3<f32>,
    @location(3) vViewDir  : vec3<f32>,
};

fn schlick_fresnel(cosTheta: f32, F0: vec3<f32>) -> vec3<f32> {
    return F0 + (vec3<f32>(1.0) - F0) * pow(1.0 - cosTheta, 5.0);
}

@fragment
fn main(in: FragmentInput) -> @location(0) vec4<f32> {
    var N = normalize(in.vNormal);
    let V = normalize(in.vViewDir);

    // sample base color
    let albedoSample = textureSample(baseColorTex, samp, in.vUV);
    let albedo = albedoSample.rgb;

    // sample normal map and convert to [-1,1]
    let nm = textureSample(normalMapTex, samp, in.vUV);
    let mapped = normalize(vec3<f32>(nm.x * 2.0 - 1.0, nm.y * 2.0 - 1.0, nm.z * 2.0 - 1.0));
    // blend analytic normal and normal map; higher blend = more detail from normal map
    N = normalize(mix(N, mapped, 0.6));

    // AO and roughness
    let ao = textureSample(aoTex, samp, in.vUV).r;
    let roughSample = textureSample(roughnessTex, samp, in.vUV).r;
    let roughness = clamp(roughSample * uMaterial.z, 0.0, 1.0);

    // lighting (simple directional)
    let L = normalize(vec3<f32>(0.3, 0.9, 0.5));
    let diff = max(dot(N, L), 0.0);
    let H = normalize(L + V);
    let spec = pow(max(dot(N, H), 0.0), mix(8.0, 128.0, 1.0 - roughness));

    // depth below surface (assume water surface at y=0)
    let depthBelow = max(0.0, -in.vWorldPos.y);
    // Beer-Lambert extinction
    let extinction = 2.2; // tweak for look
    let transmission = exp(-extinction * depthBelow);

    // color mixing between shallow and deep tints
    let shallowColor = vec3<f32>(0.02, 0.45, 0.7);
    let deepColor    = vec3<f32>(0.0, 0.02, 0.06);
    var waterTint = mix(deepColor, shallowColor, transmission);

    // fresnel
    let F0 = vec3<f32>(0.02);
    let fresnel = schlick_fresnel(clamp(dot(V, N), 0.0, 1.0), F0);
    let reflectAmount = fresnel.x * (1.0 - roughness);
    let envColor = vec3<f32>(0.7, 0.85, 0.95);

    var color = mix(waterTint * albedo, envColor, reflectAmount * 0.9);

    // lambert + ao
    color = color * (0.18 + diff * 0.82) * ao;

    // specular contribution modulated by roughness
    color += vec3<f32>(1.0) * spec * 0.5 * (1.0 - roughness);

    // additional foam in very shallow areas
    let foam = smoothstep(0.0, 0.15, transmission);
    color = mix(color, vec3<f32>(1.0), foam * 0.06);

    // alpha: near surface more transparent, deep more opaque
    let alphaShallow: f32 = 0.5;
    let alphaDeep: f32 = 0.98;
    let alpha = clamp(mix(alphaDeep, alphaShallow, transmission), 0.0, 1.0);

    color = clamp(color, vec3<f32>(0.0), vec3<f32>(1.0));
    return vec4<f32>(color, alpha);
}
