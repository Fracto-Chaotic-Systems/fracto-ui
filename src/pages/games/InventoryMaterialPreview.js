import { DoubleSide } from "three";

// Some FBX cutout exports set global opacity to zero and reuse the color texture
// as the transparency map. Render its alpha channel instead of hiding every card.
export function repair_fbx_cutouts(root, format) {
  if (format !== "fbx") return 0;
  const repaired = new Set();
  root.traverse((node) => {
    if (!node.isMesh) return;
    for (const material of [node.material].flat()) {
      if (
        repaired.has(material) ||
        material.opacity !== 0 ||
        !material.transparent ||
        !material.map ||
        material.alphaMap !== material.map
      )
        continue;
      material.opacity = 1;
      material.transparent = false;
      material.alphaMap = null;
      material.alphaTest = 0.5;
      material.side = DoubleSide;
      material.specular?.setHex(0x111111);
      material.needsUpdate = true;
      repaired.add(material);
    }
  });
  return repaired.size;
}
