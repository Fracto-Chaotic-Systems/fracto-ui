import assert from "node:assert/strict";
import test from "node:test";
import { FIRE_PALETTES } from "@fracto/sdk/FractoMaterialEffects.js";
import { load_preview_controls } from "./inventory_preview_controls_fixture.js";
// Expands function components so the rendered controls can be inspected.
const expand = (node) => {
  if (Array.isArray(node)) return Array.from(node).flatMap(expand);
  if (!node || typeof node !== "object") return [];
  if (typeof node.type === "function") return expand(node.type(node.props));
  return [node, ...expand(node.props?.children)];
};
const inputs = (tree, type) =>
  expand(tree).filter(
    (node) => node.type === "input" && node.props.type === type,
  );

test("the shared lighting controls use one range for every asset page", () => {
  const controls = load_preview_controls();
  const changes = [];
  const tree = controls.PreviewLightingControls({
    direction: 45,
    intensity: 3,
    on_change: (field, value) => changes.push([field, value]),
  });
  const [direction, intensity] = inputs(tree, "range");
  assert.deepEqual(
    [direction.props.min, direction.props.max, direction.props.step],
    [0, 360, 5],
  );
  assert.deepEqual(
    [intensity.props.min, intensity.props.max, intensity.props.step],
    [0.25, 6, 0.25],
  );
  assert.equal(direction.props["aria-label"], "lighting");
  assert.equal(intensity.props["aria-label"], "strength");
  direction.props.onChange({ target: { value: "120" } });
  intensity.props.onChange({ target: { value: "1.25" } });
  for (const value of ["NaN", "Infinity", "-1", "7"])
    intensity.props.onChange({ target: { value } });
  assert.deepEqual(changes, [
    ["direction", 120],
    ["intensity", 1.25],
  ]);
  const blocked = controls.PreviewLightingControls({
    direction: 45,
    intensity: 3,
    disabled: true,
    on_change: () => changes.push("blocked"),
  });
  inputs(blocked, "range")[0].props.onChange({ target: { value: "90" } });
  assert.equal(changes.length, 2);
});

test("scale shows the scaled height; animation is a labelled toggle", () => {
  const controls = load_preview_controls();
  const scales = [];
  const tree = controls.PreviewScaleControls({
    scale: 0.5,
    height: 1.5,
    on_change: (value) => scales.push(value),
  });
  const [range] = inputs(tree, "range");
  assert.deepEqual(
    [range.props.min, range.props.max, range.props.step],
    [0.1, 2, 0.05],
  );
  range.props.onChange({ target: { value: "1.5" } });
  assert.deepEqual(scales, [1.5]);
  const height = expand(tree).find(
    (node) =>
      node.type === "output" &&
      String(Array.from([node.props.children].flat()).join("")).includes(" m"),
  );
  assert.equal(Array.from([height.props.children].flat()).join(""), "0.75 m");
  const unknown = controls.PreviewScaleControls({
    scale: 1,
    height: null,
    on_change() {},
  });
  assert.ok(
    expand(unknown).some(
      (node) =>
        node.type === "output" &&
        Array.from([node.props.children].flat()).join("") === "— m",
    ),
  );
  const toggled = [];
  const toggle = controls.PreviewAnimationToggle({
    checked: true,
    on_change: (value) => toggled.push(value),
  });
  assert.equal(Array.from(toggle.props.children)[1], "animation");
  inputs(toggle, "checkbox")[0].props.onChange({ target: { checked: false } });
  assert.deepEqual(toggled, [false]);
});

test("flame color offers the saved color and the odd pattern cardinalities 1-15", () => {
  const controls = load_preview_controls();
  const changes = [];
  const tree = controls.PreviewFlameColor({
    value: 5,
    on_change: (value) => changes.push(value),
  });
  const select = expand(tree).find((node) => node.type === "select");
  assert.equal(select.props.value, "5");
  const options = expand(select.props.children).filter(
    (node) => node.type === "option",
  );
  assert.deepEqual(
    options.map((option) => option.props.value),
    ["saved", "1", "3", "5", "7", "9", "11", "13", "15"],
  );
  assert.equal(options[2].props.children, "flame_pattern");
  const swatch = expand(tree).find((node) => node.type === "span");
  assert.equal(swatch.props.style.background, FIRE_PALETTES[5].body);
  for (const value of ["3", "2", "17", "orange", "saved"])
    select.props.onChange({ target: { value } });
  assert.deepEqual(changes, [3, "saved"]);
});
