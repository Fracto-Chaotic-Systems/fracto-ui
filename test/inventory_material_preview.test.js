import assert from "node:assert/strict";
import test from "node:test";
import {
  Group,
  Mesh,
  PlaneGeometry,
  MeshPhongMaterial,
  Texture,
  DoubleSide,
} from "three";
import { repair_fbx_cutouts } from "../src/pages/games/InventoryMaterialPreview.js";

function fixture(options = {}) {
  const map = new Texture();
  const material = new MeshPhongMaterial({
    map,
    alphaMap: map,
    opacity: 0,
    transparent: true,
    specular: 0xffffff,
    ...options,
  });
  const root = new Group();
  root.add(
    new Mesh(new PlaneGeometry(), material),
    new Mesh(new PlaneGeometry(), material),
  );
  return { root, material, map };
}
test("zero-opacity FBX cutouts use texture alpha and render from both sides", () => {
  const { root, material, map } = fixture();
  assert.equal(repair_fbx_cutouts(root, "fbx"), 1);
  assert.equal(material.opacity, 1);
  assert.equal(material.transparent, false);
  assert.equal(material.alphaMap, null);
  assert.equal(material.map, map);
  assert.equal(material.alphaTest, 0.5);
  assert.equal(material.side, DoubleSide);
  assert.equal(material.specular.getHex(), 0x111111);
  assert.equal(repair_fbx_cutouts(root, "fbx"), 0);
});
test("intentional transparency, distinct alpha masks and other formats are not changed", () => {
  for (const options of [
    { opacity: 0.3 },
    { alphaMap: new Texture() },
    { map: null },
    { transparent: false },
  ]) {
    const { root, material } = fixture(options),
      before = material.opacity;
    assert.equal(repair_fbx_cutouts(root, "fbx"), 0);
    assert.equal(material.opacity, before);
  }
  const { root, material } = fixture();
  assert.equal(repair_fbx_cutouts(root, "glb"), 0);
  assert.equal(material.opacity, 0);
});
