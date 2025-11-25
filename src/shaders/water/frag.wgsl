// shaders/water/frag.wgsl
// Fragment shader: filtered samples for color/normal/ao/roughness + shading
// groups: 0 = frame, 1 = scene, 3 = material (sampler + textures + UB)

@group(0) @binding(0) var<uniform> uFrame: vec4<f32>;

struct SceneUniform
{
    viewProj: mat4x4<f32>,
    cameraPos: vec4<f32>
};

@group(1) @binding(0) var<uniform> uScene: SceneUniform;
@group(1) @binding(1) var skyboxSampler: sampler;
@group(1) @binding(2) var skyboxTexture: texture_cube<f32>;
@group(1) @binding(3) var reflectionTexture: texture_2d<f32>;
// Material bindings
@group(3) @binding(0) var samp: sampler; // fragment-only sampler
@group(3) @binding(1) var baseColorTex: texture_2d<f32>;
// Other textures unused for flat water, but bindings must match layout if we use the same layout
@group(3) @binding(2) var normalMapTex: texture_2d<f32>;
@group(3) @binding(3) var displacementMapTex: texture_2d<f32>;
@group(3) @binding(4) var aoTex: texture_2d<f32>;
@group(3) @binding(5) var roughnessTex: texture_2d<f32>;
@group(3) @binding(6) var<uniform> uMaterial: vec4<f32>;

struct FragmentInput
{
    @location(0) vNormal: vec3<f32>,
    @location(1) vUV: vec2<f32>,
    @location(2) vWorldPos: vec3<f32>,
    @location(3) vViewDir: vec3<f32>,
    @location(4) vClipPos: vec4<f32>
};

fn schlick_fresnel(cosTheta: f32, F0: vec3<f32>) -> vec3<f32>
{
    return F0 + (vec3<f32>(1.0) - F0) * pow(1.0 - cosTheta, 5.0);
}

@fragment
fn main(in: FragmentInput) -> @location(0) vec4<f32>
{
    // Flat water surface
    // Depth absorption (Beer's Law)

    let N = normalize(in.vNormal);
    let V = normalize(in.vViewDir);

    // Reflection
    // Calculate screen space UV
    let ndc = in.vClipPos.xy / in.vClipPos.w;
    var screenUV = ndc * vec2<f32>(0.5, 0.5) + vec2<f32>(0.5, 0.5); // No Y-flip for texture coords

    // Standard Water Model

    // 1. Calculate Surface Normal (Procedural Waves)
    // We use the derivative of the wave function to get the normal
    let time = uFrame.x * 0.5; // Slower, more majestic movement
    let worldPos = in.vWorldPos.xz;

    // Simple sum of sines for height, but we need derivatives for normal
    // Normal = normalize(vec3(-dh/dx, 1.0, -dh/dz))

    var dh_dx = 0.0;
    var dh_dz = 0.0;

    // Wave 1
    let k1 = vec2<f32>(1.0, 0.5); // Direction
    let f1 = 2.0; // Frequency
    let a1 = 0.01; // Amplitude
    let p1 = dot(k1, worldPos) * f1 + time;
    dh_dx += k1.x * f1 * a1 * cos(p1);
    dh_dz += k1.y * f1 * a1 * cos(p1);

    // Wave 2
    let k2 = vec2<f32>(0.7, -1.0);
    let f2 = 1.5;
    let a2 = 0.008;
    let p2 = dot(k2, worldPos) * f2 + time * 1.2;
    dh_dx += k2.x * f2 * a2 * cos(p2);
    dh_dz += k2.y * f2 * a2 * cos(p2);

    // Wave 3 (High frequency detail)
    let k3 = vec2<f32>(-0.2, 1.5);
    let f3 = 4.0;
    let a3 = 0.003;
    let p3 = dot(k3, worldPos) * f3 + time * 1.5;
    dh_dx += k3.x * f3 * a3 * cos(p3);
    dh_dz += k3.y * f3 * a3 * cos(p3);

    let normal = normalize(vec3<f32>(-dh_dx, 1.0, -dh_dz));

    // 2. Calculate Fresnel Term
    // F = F0 + (1 - F0) * (1 - cos(theta))^5
    // View vector
    let viewDir = normalize(uScene.cameraPos.xyz - in.vWorldPos);
    let NdotV = max(dot(normal, viewDir), 0.0);
    let F0 = 0.02; // Reflectivity of water at normal incidence
    let fresnel = F0 + (1.0 - F0) * pow(1.0 - NdotV, 5.0);

    // 3. Distort Reflection UVs based on Normal
    // The distortion should be proportional to the normal's XY components
    // Reduced strength to prevent sampling outside valid reflection area
    let distortionStrength = 0.02; // Reduced from 0.05 to minimize artifacts
    let distortion = normal.xz * distortionStrength;

    var reflectionUV = screenUV + distortion;
    reflectionUV = clamp(reflectionUV, vec2<f32>(0.001), vec2<f32>(0.999));

    // 4. Sample Reflection
    let reflectionColor = textureSample(reflectionTexture, samp, reflectionUV).rgb;

    // 5. Water Color (Deep water absorption)
    let deepWaterColor = vec3<f32>(0.05, 0.1, 0.2); // Dark blue-black
    let shallowWaterColor = vec3<f32>(0.1, 0.3, 0.4); // Teal-ish

    // Mix based on Fresnel: High Fresnel = More Reflection, Low Fresnel = More Water Color
    // Also mix deep/shallow based on viewing angle (fake depth)
    let waterBase = mix(deepWaterColor, shallowWaterColor, pow(1.0 - NdotV, 2.0));

    let finalColor = mix(waterBase, reflectionColor, fresnel * 0.8 + 0.2); // Always keep some reflection

    return vec4<f32>(finalColor, 1.0);
}
