import assert from "node:assert/strict";
import test from "node:test";
import {
  AnimationClip,
  Group,
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
  NumberKeyframeTrack,
  VectorKeyframeTrack,
  Color,
  Texture,
  SRGBColorSpace,
  ShaderLib,
} from "three";
import { create_inventory_animation } from "../src/pages/games/InventoryAnimation.js";
import {
  inventory_spec_gloss,
  InventorySpecGlossMaterial,
} from "../src/pages/games/InventorySpecGloss.js";

test("morph animation loops, preserves framing and releases bindings", () => {
  const root = new Group(),
    frame = new Group();
  frame.position.set(3, 4, 5);
  frame.scale.setScalar(2);
  frame.add(root);
  const mesh = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
  mesh.name = "leaves";
  mesh.morphTargetInfluences = [0];
  mesh.morphTargetDictionary = {};
  root.add(mesh);
  root.animations = [
    new AnimationClip("wind", 1, [
      new NumberKeyframeTrack(
        "leaves.morphTargetInfluences[0]",
        [0, 0.5, 1],
        [0, 1, 0],
      ),
    ]),
  ];
  const playback = create_inventory_animation(root);
  assert.equal(playback.count, 1);
  playback.update(0.25);
  assert.equal(mesh.morphTargetInfluences[0], 0.5);
  playback.update(1);
  assert.equal(mesh.morphTargetInfluences[0], 0.5);
  assert.deepEqual(frame.position.toArray(), [3, 4, 5]);
  assert.equal(frame.scale.x, 2);
  playback.dispose();
  assert.equal(mesh.morphTargetInfluences[0], 0);
  playback.update(0.25);
  assert.equal(mesh.morphTargetInfluences[0], 0);
});

test("only the first authored clip plays and static models stay static", () => {
  const root = new Group();
  root.name = "tree";
  root.animations = [1, 2].map(
    (x) =>
      new AnimationClip("move" + x, 1, [
        new VectorKeyframeTrack("tree.position", [0, 1], [0, 0, 0, x, 0, 0]),
      ]),
  );
  const playback = create_inventory_animation(root);
  playback.update(0.5);
  assert.equal(root.position.x, 0.5);
  playback.dispose();
  const static_model = new Group();
  const still = create_inventory_animation(static_model);
  assert.equal(still.count, 0);
  still.update(1);
  still.dispose();
  assert.equal(static_model.position.x, 0);
});

test("legacy foliage maps, alpha factors and gloss UVs are retained", async () => {
  const calls = [],
    texture = new Texture();
  const parser = {
    json: {
      materials: [
        {
          extensions: {
            KHR_materials_pbrSpecularGlossiness: {
              diffuseFactor: [0.2, 0.4, 0.6, 0.8],
              diffuseTexture: { index: 3 },
              specularFactor: [0.1, 0.2, 0.3],
              glossinessFactor: 0.7,
              specularGlossinessTexture: { index: 4, texCoord: 1 },
            },
          },
        },
        {},
      ],
    },
    assignTexture: async (params, key, info, space) => {
      calls.push({ key, info, space });
      params[key] = texture;
    },
  };
  const plugin = inventory_spec_gloss(parser),
    params = { color: new Color(), metalness: 1 };
  assert.equal(plugin.getMaterialType(0), InventorySpecGlossMaterial);
  assert.equal(plugin.getMaterialType(1), null);
  await plugin.extendMaterialParams(0, params);
  assert.deepEqual(params.color.toArray(), [0.2, 0.4, 0.6]);
  assert.equal(params.opacity, 0.8);
  assert.equal(params.metalness, 0);
  assert.ok(Math.abs(params.roughness - 0.3) < 1e-10);
  assert.deepEqual(
    calls.map((c) => c.key),
    ["map", "specularColorMap", "roughnessMap"],
  );
  assert.ok(calls.every((c) => c.space === SRGBColorSpace));
  assert.equal(calls[2].info.texCoord, 1);
  const normal = { roughness: 0.8 };
  await plugin.extendMaterialParams(1, normal);
  assert.deepEqual(normal, { roughness: 0.8 });
});

test("legacy shader reads gloss alpha and direct specular reflectance in current Three shaders", () => {
  const material = new InventorySpecGlossMaterial();
  const shader = { fragmentShader: ShaderLib.physical.fragmentShader };
  material.onBeforeCompile(shader);
  assert.ok(
    shader.fragmentShader.includes(
      "roughnessFactor = 1.0 - (1.0 - roughnessFactor) * texelRoughness.a;",
    ),
  );
  assert.ok(
    shader.fragmentShader.includes(
      "material.specularColor = specularColorFactor;",
    ),
  );
  assert.ok(!shader.fragmentShader.includes("pow2( ( material.ior - 1.0 )"));
  assert.equal(
    material.clone().customProgramCacheKey(),
    material.customProgramCacheKey(),
  );
});
