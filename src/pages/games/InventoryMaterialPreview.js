import { DoubleSide } from "three";

// Sample only a small canvas; mixed transparent/visible pixels identify a cutout.
// No image bytes are rewritten and opaque alpha data (for example bark) is kept.
export function texture_has_cutout_alpha(texture) {
  const image = texture?.image;
  if (!image?.width || !image?.height || typeof document === "undefined")
    return false;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, 64, 64);
    const data = context.getImageData(0, 0, 64, 64).data;
    let empty = false,
      visible = false;
    for (let i = 3; i < data.length; i += 4) {
      empty ||= data[i] === 0;
      visible ||= data[i] >= 128;
      if (empty && visible) return true;
    }
  } catch {
    /* An undecoded/unreadable image cannot justify changing a material. */
  }
  return false;
}

// Correct known FBX cutout export patterns in memory, including late textures.
export function repair_fbx_cutouts(
  root,
  format,
  sample = texture_has_cutout_alpha,
) {
  if (format !== "fbx") return 0;
  const repaired = new Set(),
    sampled = new Map();
  root.traverse((node) => {
    if (!node.isMesh) return;
    for (const material of [node.material].flat()) {
      if (repaired.has(material)) continue;
      const saved = material.userData.inventory_maps;
      const map = material.map || saved?.base;
      const alpha_map = material.alphaMap || saved?.alpha_map;
      const zero_opacity =
        material.opacity === 0 &&
        material.transparent &&
        map &&
        alpha_map === map;
      let opaque_cutout = false;
      if (
        material.opacity === 1 &&
        !material.transparent &&
        (saved?.alpha ?? material.alphaTest) === 0 &&
        !alpha_map &&
        map
      ) {
        if (!sampled.has(map)) sampled.set(map, sample(map));
        opaque_cutout = sampled.get(map);
      }
      if (!zero_opacity && !opaque_cutout) continue;
      material.opacity = 1;
      material.transparent = false;
      material.alphaMap = null;
      material.alphaTest = 0.5;
      material.side = DoubleSide;
      material.specular?.setHex(0x111111);
      if (saved) {
        saved.alpha = material.alphaTest;
        saved.alpha_map = null;
      }
      material.needsUpdate = true;
      repaired.add(material);
    }
  });
  return repaired.size;
}
