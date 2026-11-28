import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { transformSync } from "esbuild";
import * as THREE from "three";
import {
  component_lighting,
  create_component_document,
  DEFAULT_COMPONENT_AMBIENT,
} from "@fracto/sdk/FractoComponentDocument.js";
import { update_component_lighting } from "../src/pages/games/ComponentStageLighting.js";

test("lighting uses the materials viewer azimuth and native intensity", () => {
  const light = new THREE.DirectionalLight();
  for (const [angle, expected] of [
    [0, [4, 3, 0]],
    [90, [0, 3, 4]],
    [180, [-4, 3, 0]],
    [270, [0, 3, -4]],
  ]) {
    update_component_lighting(light, {
      lighting: { direction_degrees: angle, intensity: 0.75 },
    });
    assert.ok(
      light.position.distanceTo(new THREE.Vector3(...expected)) < 1e-10,
    );
    assert.equal(light.intensity, 0.75);
  }
  update_component_lighting(light, {});
  assert.equal(light.intensity, 3);
  assert.ok(Math.abs(light.position.x - Math.sqrt(8)) < 1e-10);
  const sky = new THREE.HemisphereLight();
  update_component_lighting(
    light,
    { lighting: { direction_degrees: 45, intensity: 0.4, ambient: 0.3 } },
    sky,
  );
  assert.equal(sky.intensity, 0.3);
  update_component_lighting(light, {}, sky);
  assert.equal(sky.intensity, 2);
});

test("lighting controls author component defaults and reject invalid or busy edits", async () => {
  const { load_preview_controls } =
    await import("./inventory_preview_controls_fixture.js");
  const shared = load_preview_controls();
  const source = readFileSync(
    new URL(
      "../src/pages/games/ComponentStageLightingControls.jsx",
      import.meta.url,
    ),
    "utf8",
  ).replace(/^import[^;]+;\r?\n/gm, "");
  const module = { exports: {} };
  runInNewContext(
    transformSync(source, { loader: "jsx", format: "cjs", jsx: "automatic" })
      .code,
    {
      module,
      exports: module.exports,
      require: createRequire(import.meta.url),
      AppText: { get: (v) => v },
      COMPONENT_STAGE_TEXT: {
        stage_lighting: "Stage lighting",
        stage_ambient: "Ambient light",
      },
      component_lighting,
      DEFAULT_COMPONENT_AMBIENT,
      StageLightingGroup: "group",
      PreviewLightingControls: shared.PreviewLightingControls,
      PreviewRange: shared.PreviewRange,
      PREVIEW_RANGES: shared.PREVIEW_RANGES,
    },
  );
  const document = create_component_document(randomUUID(), "Stage"),
    edits = [];
  const render = (disabled = false) =>
    module.exports.default({
      document,
      on_change: (v) => edits.push(v),
      disabled,
      hidden: true,
    });
  const expand = (node) => {
    if (Array.isArray(node)) return Array.from(node).flatMap(expand);
    if (!node || typeof node !== "object") return [];
    if (typeof node.type === "function") return expand(node.type(node.props));
    return [node, ...expand(node.props?.children)];
  };
  const inputs = (tree) => expand(tree).filter((node) => node.type === "input");
  const tree = render(),
    [direction, intensity] = inputs(tree);
  assert.equal(tree.props.hidden, true);
  assert.equal(tree.props["aria-label"], "Stage lighting");
  assert.equal(direction.props.value, 45);
  assert.equal(intensity.props.value, 3);
  direction.props.onChange({ target: { value: "120" } });
  assert.equal(edits[0].lighting.direction_degrees, 120);
  assert.equal(edits[0].lighting.intensity, 3);
  assert.equal(edits[0].id, document.id);
  assert.equal(document.lighting.direction_degrees, 45);
  intensity.props.onChange({ target: { value: "1.25" } });
  assert.equal(edits[1].lighting.intensity, 1.25);
  for (const value of ["NaN", "Infinity", "-1", "7"])
    intensity.props.onChange({ target: { value } });
  const ambient = inputs(tree)[2];
  assert.equal(ambient.props.value, 2);
  ambient.props.onChange({ target: { value: "0.3" } });
  assert.equal(edits[2].lighting.ambient, 0.3);
  assert.equal(edits[2].lighting.direction_degrees, 45);
  inputs(render(true))[0].props.onChange({ target: { value: "180" } });
  assert.equal(edits.length, 3);
});
