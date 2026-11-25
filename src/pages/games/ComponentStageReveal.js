import { MeshDepthMaterial, RGBADepthPacking } from "three";

export const COMPONENT_REVEAL_SECONDS = 1.2;

// Coverage fading retains foliage depth writes and authored alpha cutouts. The
// same coverage ramp in the shadow pass avoids solid shadows from hidden plants.
// All temporary materials are local to this arriving group, never its prototype.
export function create_component_reveal(root) {
  const uniform = { value: 0 },
    originals = [],
    temporary = new Set(),
    materials = new Map();
  let elapsed = 0,
    active = true;
  const decorate = (material, original = material) => {
    const compile = original.onBeforeCompile;
    const key = original.customProgramCacheKey();
    material.onBeforeCompile = function (shader, renderer) {
      compile.call(this, shader, renderer);
      shader.uniforms.componentReveal = uniform;
      shader.fragmentShader =
        "uniform float componentReveal;\n" +
        shader.fragmentShader.replace(
          "#include <alphatest_fragment>",
          `#include <alphatest_fragment>
float componentRevealNoise = fract(52.9829189 * fract(dot(floor(gl_FragCoord.xy), vec2(0.06711056, 0.00583715))));
if (componentReveal <= componentRevealNoise) discard;`,
        );
    };
    material.customProgramCacheKey = () => `${key}|component-reveal-v1`;
    temporary.add(material);
    return material;
  };
  const visible = (material) => {
    if (!materials.has(material))
      materials.set(material, decorate(material.clone(), material));
    return materials.get(material);
  };
  root.traverse((node) => {
    if (!node.isMesh) return;
    originals.push({
      node,
      material: node.material,
      depth: node.customDepthMaterial,
    });
    node.material = Array.isArray(node.material)
      ? node.material.map(visible)
      : visible(node.material);
    node.customDepthMaterial = node.customDepthMaterial
      ? decorate(node.customDepthMaterial.clone(), node.customDepthMaterial)
      : decorate(new MeshDepthMaterial({ depthPacking: RGBADepthPacking }));
  });
  const finish = () => {
    if (!active) return;
    active = false;
    uniform.value = 1;
    for (const { node, material, depth } of originals) {
      node.material = material;
      node.customDepthMaterial = depth;
    }
    for (const material of temporary) material.dispose();
    originals.length = 0;
    temporary.clear();
    materials.clear();
  };
  return {
    get active() {
      return active;
    },
    update(delta) {
      if (!active) return;
      elapsed += delta;
      const t = Math.min(elapsed / COMPONENT_REVEAL_SECONDS, 1);
      uniform.value = t * t * (3 - 2 * t);
      if (t === 1) finish();
    },
    dispose: finish,
  };
}
