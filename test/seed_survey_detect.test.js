import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";

test("detect passes a 150-square source to a left-aligned 350-square canvas", () => {
  const source = readFileSync(
    new URL(
      "../src/pages/assets/surveys/SeedSurveyDetect.jsx",
      import.meta.url,
    ),
    "utf8",
  );
  const code = transformSync(
    source
      .replace(/^import[\s\S]*?;\r?\n/gm, "")
      .replace(/^export default .*;$/gm, "")
      .replace(/^export class /gm, "class "),
    { loader: "jsx" },
  ).code;
  const type = () => type;
  type.isRequired = type;
  const Detect = vm.runInNewContext(`${code}\nSeedSurveyDetect`, {
    React: {
      createElement: (type, props, ...children) => ({ type, props, children }),
    },
    Component: class {
      constructor(props) {
        this.props = props;
      }
    },
    PropTypes: new Proxy({}, { get: () => type }),
    SeedSurveyCanvas: "canvas",
    AppText: { get: (key) => key },
    KEY_ASSETS_SURVEYS_DETECT: "detect",
    KEY_ASSETS_SURVEYS_CANVAS_DETECT: "detect-canvas",
  });
  const focal_point = { x: 0.1, y: 0.2 };
  const tree = new Detect({
    focal_point,
    width_px: 600,
    height_px: 500,
  }).render();
  assert.equal(tree.props.style.textAlign, "left");
  assert.equal(tree.children[0].props.size_px, 350);
  assert.equal(tree.children[0].props.source_size_px, 150);
  assert.equal(tree.children[0].props.focal_point, focal_point);
  assert.equal(tree.children[0].props.half_span, 1.5);
  assert.equal(tree.children[0].props.iteration_limit, 100000);
  assert.equal(tree.children[0].props.aria_label, "detect-canvas");
});
