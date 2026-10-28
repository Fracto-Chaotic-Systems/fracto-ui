import * as THREE from "three";

export const DEFAULT_TERRAIN_LIGHTING = {
  enabled: false, ambient: 0.55, intensity: 0.7, azimuth: 315, elevation: 45,
};

export function normalize_terrain_lighting(value) {
  const bounded = (key, min, max) => Number.isFinite(value?.[key])
    ? Math.max(min, Math.min(max, value[key])) : DEFAULT_TERRAIN_LIGHTING[key];
  return {
    enabled: typeof value?.enabled === "boolean" ? value.enabled : false,
    ambient: bounded("ambient", 0, 1), intensity: bounded("intensity", 0, 2),
    azimuth: bounded("azimuth", 0, 360), elevation: bounded("elevation", 5, 90),
  };
}

/** Fragment-derived normals keep lighting independent of million-vertex normal arrays. */
export class TerrainLighting {
  uniforms = {
    terrainLightEnabled: { value: 0 }, terrainAmbient: { value: 0.55 },
    terrainIntensity: { value: 0.7 }, terrainLightDirection: { value: new THREE.Vector3() },
  };

  update(settings) {
    const value = normalize_terrain_lighting(settings);
    const azimuth = THREE.MathUtils.degToRad(value.azimuth);
    const elevation = THREE.MathUtils.degToRad(value.elevation);
    this.uniforms.terrainLightEnabled.value = value.enabled ? 1 : 0;
    this.uniforms.terrainAmbient.value = value.ambient;
    this.uniforms.terrainIntensity.value = value.intensity;
    this.uniforms.terrainLightDirection.value.set(
      Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation),
      -Math.cos(azimuth) * Math.cos(elevation),
    );
  }

  attach(material) {
    material.customProgramCacheKey = () => "fracto-terrain-lighting-v1";
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = `varying vec3 vTerrainPosition;\n${shader.vertexShader}`
        .replace("#include <project_vertex>", `#include <project_vertex>
          vTerrainPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
      shader.fragmentShader = `
        varying vec3 vTerrainPosition;
        uniform float terrainLightEnabled;
        uniform float terrainAmbient;
        uniform float terrainIntensity;
        uniform vec3 terrainLightDirection;
        ${shader.fragmentShader}`.replace("#include <opaque_fragment>", `
          if (terrainLightEnabled > 0.5) {
            vec3 terrainNormal = normalize(cross(dFdx(vTerrainPosition), dFdy(vTerrainPosition)));
            if (!gl_FrontFacing) terrainNormal = -terrainNormal;
            float diffuse = max(dot(terrainNormal, terrainLightDirection), 0.0);
            outgoingLight *= terrainAmbient + terrainIntensity * diffuse;
          }
          #include <opaque_fragment>`);
    };
  }
}
