// shaders/cube/frag.wgsl

@fragment
fn main(
    @location(0) vNormal : vec3<f32>,
    @location(1) vUV     : vec2<f32>
) -> @location(0) vec4<f32>
{
    let n = normalize(vNormal);
    // Simple diffuse light
    let lightDir = normalize(vec3<f32>(0.5, 0.7, 1.0));
    let diff = max(dot(n, lightDir), 0.0);

    // Use UV to tint the result so you can see UVs (debug)
    let base = vec3<f32>(vUV.x, vUV.y, 1.0) * 0.8;

    // final color
    let color = base * (0.2 + diff); // ambient + diffuse
    return vec4<f32>(color, 1.0);
}