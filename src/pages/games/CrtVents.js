import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function add_crt_vents(head, shell) {
  const grime = new THREE.MeshStandardMaterial({
    color: "#65583c",
    roughness: 1,
  });
  const interior = new THREE.MeshBasicMaterial({ color: "#121710" });
  const rim_geometry = new RoundedBoxGeometry(0.012, 0.076, 0.69, 2, 0.005);
  const slot_geometry = new RoundedBoxGeometry(0.012, 0.044, 0.63, 2, 0.005);
  const lip_geometry = new RoundedBoxGeometry(0.027, 0.012, 0.65, 2, 0.004);
  for (const side of [-1, 1]) {
    for (let row = 0; row < 6; row++) {
      const y = 0.32 - row * 0.115;
      const rim = new THREE.Mesh(rim_geometry, grime);
      rim.position.set(side * 0.974, y, -0.12);
      const slot = new THREE.Mesh(slot_geometry, interior);
      slot.position.set(side * 0.982, y + 0.003, -0.12);
      // A molded lower lip catches the light beneath each dark recess.
      const lip = new THREE.Mesh(lip_geometry, shell);
      lip.position.set(side * 0.981, y - 0.031, -0.12);
      head.add(rim, slot, lip);
    }
  }
}
