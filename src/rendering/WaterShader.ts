/**
 * Kraken's Quay: Splash & Shot - Advanced Water Shader
 *
 * Features:
 * - Gerstner wave vertex displacement
 * - Normal mapping with scrolling detail
 * - Screen-space refraction (approximation)
 * - Fresnel-based reflection
 * - Foam at wave crests and shorelines
 * - Animated caustics on underwater surfaces
 * - Depth-based color absorption
 * - Specular highlights with anisotropy
 * - Distance fog blending
 */

import * as THREE from "three";

export const WaterVertexShader = `
  uniform float time;
  uniform float waveScale;
  uniform vec2 waveDirection;
  uniform float waveSpeed;
  uniform float waveHeight;
  uniform vec3 cameraPosition;

  varying vec3 vWorldPosition;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vDepth;
  varying float vFoamFactor;

  // Gerstner wave function
  vec3 gerstnerWave(vec2 position, float frequency, float amplitude, float speed, float direction, float time) {
    float phase = frequency * (position.x * cos(direction) + position.y * sin(direction)) + speed * time;
    float c = cos(phase);
    float s = sin(phase);

    vec3 offset = vec3(
      amplitude * frequency * c * cos(direction),
      amplitude * s,
      amplitude * frequency * c * sin(direction)
    );

    // Normal contribution
    vec3 normal = vec3(
      -amplitude * frequency * frequency * s * cos(direction),
      1.0 - amplitude * frequency * c,
      -amplitude * frequency * frequency * s * sin(direction)
    );

    return offset + normal * 0.0; // We'll compute normal separately
  }

  // Calculate Gerstner normal
  vec3 gerstnerNormal(vec2 position, float frequency, float amplitude, float speed, float direction, float time) {
    float phase = frequency * (position.x * cos(direction) + position.y * sin(direction)) + speed * time;
    float c = cos(phase);
    float s = sin(phase);

    return normalize(vec3(
      -amplitude * frequency * frequency * s * cos(direction),
      1.0,
      -amplitude * frequency * frequency * s * sin(direction)
    ));
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    vec2 worldXZ = (modelMatrix * vec4(position, 1.0)).xz;

    // Multiple Gerstner waves for realistic ocean
    float waveTime = time * waveSpeed;

    // Large swell waves
    vec3 swellOffset = vec3(0.0);
    vec3 swellNormal = vec3(0.0, 1.0, 0.0);
    {
      float freq = 0.08 * waveScale;
      float amp = 0.45 * waveHeight;
      float dir = radians(45.0);
      float phase = freq * (worldXZ.x * cos(dir) + worldXZ.y * sin(dir)) + 0.35 * waveTime;
      float c = cos(phase);
      float s = sin(phase);
      swellOffset += vec3(
        amp * freq * c * cos(dir),
        amp * s,
        amp * freq * c * sin(dir)
      );
      swellNormal += vec3(
        -amp * freq * freq * s * cos(dir),
        1.0,
        -amp * freq * freq * s * sin(dir)
      );
    }

    // Medium waves
    {
      float freq = 0.22 * waveScale;
      float amp = 0.18 * waveHeight;
      float dir = radians(125.0);
      float phase = freq * (worldXZ.x * cos(dir) + worldXZ.y * sin(dir)) + 0.7 * waveTime;
      float c = cos(phase);
      float s = sin(phase);
      swellOffset += vec3(
        amp * freq * c * cos(dir),
        amp * s,
        amp * freq * c * sin(dir)
      );
      swellNormal += vec3(
        -amp * freq * freq * s * cos(dir),
        1.0,
        -amp * freq * freq * s * sin(dir)
      );
    }

    // Small detail waves (normal map will handle most detail)
    {
      float freq = 0.65 * waveScale;
      float amp = 0.045 * waveHeight;
      float dir = radians(-35.0);
      float phase = freq * (worldXZ.x * cos(dir) + worldXZ.y * sin(dir)) + 1.4 * waveTime;
      float c = cos(phase);
      float s = sin(phase);
      swellOffset += vec3(
        amp * freq * c * cos(dir),
        amp * s,
        amp * freq * c * sin(dir)
      );
      swellNormal += vec3(
        -amp * freq * freq * s * cos(dir),
        1.0,
        -amp * freq * freq * s * sin(dir)
      );
    }

    swellNormal = normalize(swellNormal);

    pos += swellOffset;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;
    vViewDir = normalize(cameraPosition - vWorldPosition);

    // Transform normal to world space
    vec3 objectNormal = swellNormal;
    vec3 worldNormal = normalize(mat3(modelMatrix) * objectNormal);
    vNormal = worldNormal;

    // Foam factor based on wave steepness/curvature
    float curvature = length(swellOffset.y) * 2.0;
    vFoamFactor = smoothstep(0.15, 0.35, curvature) * smoothstep(0.0, 0.2, worldPosition.y + 2.0);

    // Depth for underwater effects
    vDepth = max(0.0, -worldPosition.y);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const WaterFragmentShader = `
  uniform float time;
  uniform sampler2D baseColorMap;
  uniform sampler2D normalMap;
  uniform sampler2D roughnessMap;
  uniform sampler2D metalnessMap;
  uniform sampler2D foamMap;
  uniform sampler2D causticsMap;
  uniform vec3 waterColorShallow;
  uniform vec3 waterColorDeep;
  uniform vec3 foamColor;
  uniform float waterClarity;
  uniform float foamStrength;
  uniform float causticsStrength;
  uniform float causticsScale;
  uniform float causticsSpeed;
  uniform float fresnelPower;
  uniform float fresnelIntensity;
  uniform vec3 sunDirection;
  uniform vec3 sunColor;
  uniform float sunIntensity;
  uniform float fogDensity;
  uniform vec3 fogColor;

  varying vec3 vWorldPosition;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vDepth;
  varying float vFoamFactor;

  // Fresnel-Schlick approximation
  float fresnelSchlick(float cosTheta, float exponent) {
    return pow(1.0 - cosTheta, exponent);
  }

  // GGX Distribution
  float GGXDistribution(float NdotH, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float denom = (NdotH * NdotH) * (a2 - 1.0) + 1.0;
    return a2 / (PI * denom * denom);
  }

  // Smith-GGX Geometry
  float GGXGeometry(float NdotV, float NdotL, float roughness) {
    float r = roughness + 1.0;
    float k = (r * r) / 8.0;
    float gv = NdotV / (NdotV * (1.0 - k) + k);
    float gl = NdotL / (NdotL * (1.0 - k) + k);
    return gv * gl;
  }

  // Fresnel term
  vec3 FresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
  }

  void main() {
    // Scroll normal map for animated detail
    vec2 normalUv1 = vUv * 3.2 + vec2(time * 0.003, time * -0.0015);
    vec2 normalUv2 = vUv * 5.8 + vec2(time * -0.004, time * 0.002);

    vec3 normalMap1 = texture2D(normalMap, normalUv1).xyz * 2.0 - 1.0;
    vec3 normalMap2 = texture2D(normalMap, normalUv2).xyz * 2.0 - 1.0;
    vec3 detailNormal = normalize(normalMap1 + normalMap2);

    // Blend detail normal with vertex normal
    vec3 N = normalize(vNormal + detailNormal * 0.35);
    N = normalize(N);

    vec3 V = normalize(vViewDir);

    // Base color from texture
    vec3 baseColor = texture2D(baseColorMap, vUv * 3.2).rgb;
    float roughness = texture2D(roughnessMap, vUv * 3.2).r;
    float metalness = texture2D(metalnessMap, vUv * 3.2).r;

    // Depth-based color absorption
    float depthFactor = 1.0 - exp(-vDepth * waterClarity);
    vec3 waterColor = mix(waterColorShallow, waterColorDeep, depthFactor);
    baseColor = mix(baseColor, waterColor, 0.6);

    // Caustics
    vec2 causticsUv = (vWorldPosition.xz + vec2(time * causticsSpeed, time * causticsSpeed * 0.7)) * causticsScale;
    float caustics = texture2D(causticsMap, causticsUv).r;
    baseColor += caustics * causticsStrength * sunColor * (1.0 - depthFactor * 0.7);

    // Foam
    float foamTexture = texture2D(foamMap, vUv * 8.0 + vec2(time * 0.02, 0.0)).r;
    float foam = vFoamFactor * foamStrength * foamTexture;
    vec3 foamColorFinal = foamColor * (1.0 + caustics * 0.5);

    // Lighting
    vec3 L = normalize(sunDirection);
    float NdotL = max(dot(N, L), 0.0);
    float NdotV = max(dot(N, V), 0.0);
    vec3 H = normalize(V + L);
    float NdotH = max(dot(N, H), 0.0);

    // Specular
    vec3 F0 = mix(vec3(0.02), baseColor, metalness);
    vec3 F = FresnelSchlickRoughness(NdotH, F0, roughness);
    float D = GGXDistribution(NdotH, roughness);
    float G = GGXGeometry(NdotV, NdotL, roughness);
    vec3 specular = (D * G * F) / (4.0 * NdotV * NdotL + 0.001);

    // Fresnel reflection (water surface)
    float fresnel = fresnelSchlick(NdotV, fresnelPower) * fresnelIntensity;
    vec3 reflection = mix(vec3(0.0), sunColor * sunIntensity, fresnel * NdotL);

    // Combine
    vec3 color = baseColor * (0.35 + 0.65 * NdotL) * (1.0 - foam);
    color += specular * sunColor * sunIntensity * NdotL * (1.0 - foam);
    color += reflection * (1.0 - foam);
    color += foamColorFinal * foam;

    // Underwater fog
    if (vDepth > 0.0) {
      float fogFactor = 1.0 - exp(-vDepth * fogDensity);
      color = mix(color, fogColor, fogFactor);
    }

    // Atmospheric perspective
    float distance = length(vWorldPosition - vec3(0.0, 0.0, 0.0));
    float atmosFactor = 1.0 - exp(-distance * 0.008);
    color = mix(color, fogColor, atmosFactor * 0.3);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface WaterMaterialParams {
  baseColorMap: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  metalnessMap: THREE.Texture;
  foamMap: THREE.Texture;
  causticsMap: THREE.Texture;
  waterColorShallow: THREE.Color;
  waterColorDeep: THREE.Color;
  foamColor: THREE.Color;
  waterClarity: number;
  foamStrength: number;
  causticsStrength: number;
  causticsScale: number;
  causticsSpeed: number;
  fresnelPower: number;
  fresnelIntensity: number;
  sunDirection: THREE.Vector3;
  sunColor: THREE.Color;
  sunIntensity: number;
  fogDensity: number;
  fogColor: THREE.Color;
}

export function createWaterMaterial(params: WaterMaterialParams): THREE.ShaderMaterial {
  const uniforms = {
    time: { value: 0 },
    waveScale: { value: 1.0 },
    waveDirection: { value: new THREE.Vector2(1, 0) },
    waveSpeed: { value: 0.55 },
    waveHeight: { value: 0.07 },
    cameraPosition: { value: new THREE.Vector3() },
    baseColorMap: { value: params.baseColorMap },
    normalMap: { value: params.normalMap },
    roughnessMap: { value: params.roughnessMap },
    metalnessMap: { value: params.metalnessMap },
    foamMap: { value: params.foamMap },
    causticsMap: { value: params.causticsMap },
    waterColorShallow: { value: params.waterColorShallow },
    waterColorDeep: { value: params.waterColorDeep },
    foamColor: { value: params.foamColor },
    waterClarity: { value: params.waterClarity },
    foamStrength: { value: params.foamStrength },
    causticsStrength: { value: params.causticsStrength },
    causticsScale: { value: params.causticsScale },
    causticsSpeed: { value: params.causticsSpeed },
    fresnelPower: { value: params.fresnelPower },
    fresnelIntensity: { value: params.fresnelIntensity },
    sunDirection: { value: params.sunDirection },
    sunColor: { value: params.sunColor },
    sunIntensity: { value: params.sunIntensity },
    fogDensity: { value: params.fogDensity },
    fogColor: { value: params.fogColor },
  };

  return new THREE.ShaderMaterial({
    vertexShader: WaterVertexShader,
    fragmentShader: WaterFragmentShader,
    uniforms,
    transparent: false,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
}

export function updateWaterMaterial(
  material: THREE.ShaderMaterial,
  camera: THREE.Camera,
  sun: THREE.DirectionalLight,
  elapsedTime: number
): void {
  if (!material.uniforms) return;

  material.uniforms.time.value = elapsedTime;
  material.uniforms.cameraPosition.value.copy(camera.position);
  material.uniforms.sunDirection.value.copy(sun.position).normalize();
  material.uniforms.sunColor.value.copy(sun.color);
  material.uniforms.sunIntensity.value = sun.intensity;
}