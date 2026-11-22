import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import FractoFastCalc from "@fracto/sdk/FractoFastCalc.js";
import{launch_service_fixture}from"@fracto/sdk/testing/ServiceFixture.js";
import{fileURLToPath}from"node:url";

test("orbital points page formats the reported outside-cardioid point into a closed Newton chart", async (t) => {
  const source = readFileSync(
    new URL("../src/pages/study/points/PointsMainPanel.jsx", import.meta.url),
    "utf8",
  );
  const code = transformSync(
    source
      .replace(/^import[\s\S]*?;\r?\n/gm, "")
      .replace(/^export default .*;$/gm, "")
      .replace(/^export class /gm, "class "),
    { loader: "jsx" },
  ).code;
  const Panel = vm.runInNewContext(`${code}\nPointsMainPanel`, {
    Component: class {},
    FractoFastCalc,
  });
  const point = { x: 0.2693785307, y: 0.5397724687 };
  const fixture=await launch_service_fixture(fileURLToPath(new URL("../../fracto-data-server/tests/newton_fixture.mjs",import.meta.url)),{},t);
  const response=await fetch(fixture.base+"/orbital-newton?"+new URLSearchParams({re:String(point.x),im:String(point.y),newton_mode:"big_complex"}));
  assert.equal(response.status,200);const res={body:await response.json()};
  const formatted = new Panel().format_detected_newton(res.body, point);
  assert.equal(formatted.cardinality, 4);
  assert.equal(formatted.point_list.length, 5);
  assert.ok(
    formatted.point_list.every(
      (item) =>
        Number.isFinite(Number(item.point.re)) &&
        Number.isFinite(Number(item.scaled_point.re)),
    ),
  );
  assert.deepEqual(
    formatted.point_list[0].point,
    formatted.point_list.at(-1).point,
  );
});

test("page forwards legacy iterative cardinality and formats the supplied-period Newton result", async (t) => {
  const source = readFileSync(
    new URL("../src/pages/study/points/PointsMainPanel.jsx", import.meta.url),
    "utf8",
  );
  const code = transformSync(
    source
      .replace(/^import[\s\S]*?;\r?\n/gm, "")
      .replace(/^export default .*;$/gm, "")
      .replace(/^export class /gm, "class "),
    { loader: "jsx" },
  ).code;
  const fixture=await launch_service_fixture(fileURLToPath(new URL("../../fracto-data-server/tests/newton_fixture.mjs",import.meta.url)),{},t);
  let complete; const completed=new Promise(resolve=>complete=resolve);
  let options;
  const DataBackend = {
    get_orbitals(_point, _limit, callback) {
      callback({
        result: {
          pro_derived: {
            cardinality: FractoFastCalc.calc(_point.x, _point.y).pattern,
            point_list: [],
          },
          seed_survey: {},
        },
      });
    },
    get_orbital_newton(point, callback, value) {
      options = value;
      fetch(fixture.base+"/orbital-newton?"+new URLSearchParams({re:String(point.x),im:String(point.y),...value})).then(r=>r.json()).then(data=>{callback(data);complete();});
    },
  };
  const Panel = vm.runInNewContext(`${code}\nPointsMainPanel`, {
    Component: class {
      setState(update, callback) {
        Object.assign(
          this.state,
          typeof update === "function" ? update(this.state) : update,
        );
        callback?.();
      }
    },
    FractoFastCalc,
    DataBackend,
  });
  const panel = new Panel();
  panel.is_mounted = true;
  panel.on_chart_update("frame", {
    focal_point: { x: 0.2, y: 0.3 },
  });
  await completed;
  assert.equal(options.cardinality, 1);
  assert.equal(options.cardinality_source, "legacy_iterative");
  assert.equal(options.adaptive_detection, undefined);
  assert.equal(panel.state.newton_derived.cardinality, 1);
  assert.equal(panel.state.newton_derived.point_list.length, 2);
  const formatted = panel.format_detected_newton({}, { x: 0, y: 0 }, 4);
  assert.equal(
    formatted.cardinality,
    0,
    "without confirmed closure a supplied estimate is not accepted",
  );
});
