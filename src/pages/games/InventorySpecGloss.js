import {
  Color,
  LinearSRGBColorSpace,
  MeshPhysicalMaterial,
  ShaderChunk,
  SRGBColorSpace,
} from "three";

const EXTENSION = "KHR_materials_pbrSpecularGlossiness";

// Legacy specular/glossiness stores reflectance directly in RGB and gloss in A.
// Keep the original textures/UV transforms; only adapt the preview shader.
export class InventorySpecGlossMaterial extends MeshPhysicalMaterial {
  onBeforeCompile(shader) {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <roughnessmap_fragment>",
        ShaderChunk.roughnessmap_fragment.replace(
          "roughnessFactor *= texelRoughness.g;",
          "roughnessFactor = 1.0 - (1.0 - roughnessFactor) * texelRoughness.a;",
        ),
      )
      .replace(
        "#include <lights_physical_fragment>",
        ShaderChunk.lights_physical_fragment.replace(
          "min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor",
          "specularColorFactor",
        ) +
          `
material.diffuseContribution *= 1.0 - max( material.specularColor.r, max( material.specularColor.g, material.specularColor.b ) );
`,
      );
  }
  customProgramCacheKey() {
    return "inventory-spec-gloss-v1";
  }
}

export function inventory_spec_gloss(parser) {
  const extension = (index) =>
    parser.json.materials[index].extensions?.[EXTENSION];
  return {
    name: EXTENSION,
    getMaterialType(index) {
      return extension(index) ? InventorySpecGlossMaterial : null;
    },
    async extendMaterialParams(index, params) {
      const value = extension(index);
      if (!value) return;
      const diffuse = value.diffuseFactor || [1, 1, 1, 1];
      params.color = new Color().setRGB(
        ...diffuse.slice(0, 3),
        LinearSRGBColorSpace,
      );
      params.opacity = diffuse[3];
      params.metalness = 0;
      params.metalnessMap = null;
      params.roughness = 1 - (value.glossinessFactor ?? 1);
      params.specularColor = new Color().setRGB(
        ...(value.specularFactor || [1, 1, 1]),
        LinearSRGBColorSpace,
      );
      params.specularIntensity = 1;
      const pending = [];
      if (value.diffuseTexture)
        pending.push(
          parser.assignTexture(
            params,
            "map",
            value.diffuseTexture,
            SRGBColorSpace,
          ),
        );
      if (value.specularGlossinessTexture) {
        pending.push(
          parser.assignTexture(
            params,
            "specularColorMap",
            value.specularGlossinessTexture,
            SRGBColorSpace,
          ),
        );
        pending.push(
          parser.assignTexture(
            params,
            "roughnessMap",
            value.specularGlossinessTexture,
            SRGBColorSpace,
          ),
        );
      }
      await Promise.all(pending);
    },
  };
}
