import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const oceanVertexShader = /* glsl */ `
#include <fog_pars_vertex>

uniform float uTime;

varying vec3 vWorldPosition;
varying vec3 vViewPosition;

struct GerstnerWave {
  vec2 direction;
  float amplitude;
  float wavelength;
  float speed;
};

void main() {
  // Non-harmonic natural wavelengths & directions
  GerstnerWave waves[4];
  waves[0] = GerstnerWave(normalize(vec2(1.0, 0.25)), 0.35, 230.0, 0.9);
  waves[1] = GerstnerWave(normalize(vec2(0.85, 0.45)), 0.20, 137.0, 1.2);
  waves[2] = GerstnerWave(normalize(vec2(0.95, -0.28)), 0.12, 73.0, 1.6);
  waves[3] = GerstnerWave(normalize(vec2(0.65, 0.75)), 0.05, 31.0, 2.1);

  vec3 pos = position;
  vec3 displaced = pos;

  for (int i = 0; i < 4; i++) {
    float k = 6.283185307 / waves[i].wavelength;
    float c = waves[i].speed;
    float f = k * dot(waves[i].direction, pos.xz) - c * uTime;
    displaced.y += waves[i].amplitude * sin(f);
  }

  vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
  vWorldPosition = worldPosition.xyz;

  vec4 mvPosition = viewMatrix * worldPosition;
  vViewPosition = -mvPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;

  #include <fog_vertex>
}
`;

const oceanFragmentShader = /* glsl */ `
#include <fog_pars_fragment>

uniform float uTime;
uniform vec3 uMidWaterColor;
uniform vec3 uHighWaterColor;
uniform vec3 uSkyReflectColor;
uniform vec3 uSunColor;
uniform vec3 uSunDirection;

varying vec3 vWorldPosition;
varying vec3 vViewPosition;

struct GerstnerWave {
  vec2 direction;
  float amplitude;
  float wavelength;
  float speed;
  float steepness;
};

void main() {
  // Continuous per-pixel swell evaluation with natural wave dispersion
  GerstnerWave waves[4];
  waves[0] = GerstnerWave(normalize(vec2(1.0, 0.25)), 0.35, 230.0, 0.9, 0.40);
  waves[1] = GerstnerWave(normalize(vec2(0.85, 0.45)), 0.20, 137.0, 1.2, 0.35);
  waves[2] = GerstnerWave(normalize(vec2(0.95, -0.28)), 0.12, 73.0, 1.6, 0.30);
  waves[3] = GerstnerWave(normalize(vec2(0.65, 0.75)), 0.05, 31.0, 2.1, 0.25);

  float normalX = 0.0;
  float normalZ = 0.0;
  float normalY = 0.0;
  float pixelElevation = 0.0;

  for (int i = 0; i < 4; i++) {
    float k = 6.283185307 / waves[i].wavelength;
    float c = waves[i].speed;
    float f = k * dot(waves[i].direction, vWorldPosition.xz) - c * uTime;
    float a = waves[i].amplitude;
    float q = waves[i].steepness / (k * a * 4.0);

    float cosF = cos(f);
    float sinF = sin(f);

    pixelElevation += a * sinF;
    normalX -= waves[i].direction.x * (k * a * cosF);
    normalZ -= waves[i].direction.y * (k * a * cosF);
    normalY += q * (k * a * sinF);
  }

  vec3 normal = normalize(vec3(normalX, 1.0 - normalY, normalZ));
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 sunDir = normalize(uSunDirection);

  // Micro-surface ripple perturbations with smooth distance attenuation
  float distToCam = length(cameraPosition - vWorldPosition);
  float rippleWeight = smoothstep(400.0, 30.0, distToCam) * 0.008;
  
  float ripple1 = sin(vWorldPosition.x * 0.05 + uTime * 1.3) * cos(vWorldPosition.z * 0.05 + uTime * 0.9);
  float ripple2 = cos(vWorldPosition.x * 0.10 - uTime * 1.1) * sin(vWorldPosition.z * 0.10 + uTime * 1.4);
  vec3 microNormal = normalize(normal + vec3(ripple1 * rippleWeight, 0.0, ripple2 * rippleWeight));

  // Base sea color with subtle organic crest lightening
  float waveCrestFactor = smoothstep(0.15, 0.55, pixelElevation);
  vec3 waterColor = mix(uMidWaterColor, uHighWaterColor, waveCrestFactor * 0.40);

  // Fresnel effect (Schlick approximation for sky reflection)
  float nDotV = max(0.0, dot(microNormal, viewDir));
  float fresnel = 0.03 + 0.97 * pow(1.0 - nDotV, 3.5);

  // Sun Specular Highlight (Blinn-Phong sharp solar glint + gentle sheen)
  vec3 halfVector = normalize(sunDir + viewDir);
  float nDotH = max(0.0, dot(microNormal, halfVector));
  
  float specSharp = pow(nDotH, 180.0) * 1.6;
  float specBroad = pow(nDotH, 24.0) * 0.2;
  vec3 specular = (specSharp + specBroad) * uSunColor;

  // Subsurface light scattering in rolling crests
  float sss = pow(max(0.0, dot(viewDir, -sunDir + normal * 0.4)), 3.0) * max(0.0, pixelElevation + 0.15) * 0.15;
  waterColor += uHighWaterColor * sss;

  // Mix water color with sky reflection tone (#B2D9E8) via Fresnel
  vec3 finalColor = mix(waterColor, uSkyReflectColor, fresnel * 0.45);
  finalColor += specular;

  gl_FragColor = vec4(finalColor, 1.0);

  #include <fog_fragment>
}
`;

export const Ocean: React.FC = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Static ocean plane geometry (uploaded once to GPU VBO)
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(10000, 10000, 128, 128);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  // Merge Three.js UniformsLib.fog with Mid (#55A7CC) & High (#99D7ED) water palette
  const uniforms = useMemo(
    () =>
      THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uMidWaterColor: { value: new THREE.Color('#55A7CC') },
          uHighWaterColor: { value: new THREE.Color('#99D7ED') },
          uSkyReflectColor: { value: new THREE.Color('#B2D9E8') },
          uSunColor: { value: new THREE.Color('#fffbeb') },
          uSunDirection: { value: new THREE.Vector3(250, 450, 250).normalize() },
        },
      ]),
    []
  );

  // Zero CPU vertex work: only update the elapsed time uniform per frame
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh geometry={geometry} position={[0, 0, 0]} receiveShadow>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={oceanVertexShader}
        fragmentShader={oceanFragmentShader}
        fog={true}
      />
    </mesh>
  );
};
