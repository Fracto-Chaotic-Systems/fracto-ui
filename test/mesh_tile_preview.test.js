import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import { build_terrain_tile } from "../../../sdk/terrain/Mesh.js";
import {
  encode_terrain_mesh,
  decode_terrain_mesh,
} from "../../../sdk/terrain/Cache.js";
import {
  decode_preview_mesh,
  preview_positions,
  paint_preview_tile,
} from "../src/pages/tiles/MeshTilePreviewData.js";
import FractoCanvasBuffer from "../../../sdk/FractoCanvasBuffer.js";

test("browser preview decodes the stored mesh, preserves standard palette samples and applies scope/25 relief", async () => {
  const source = Array.from({ length: 256 }, (_, x) =>
    Array.from({ length: 256 }, (_, y) => [x % 7, 100 + y]),
  );
  const mesh = build_terrain_tile(source);
  const { compressed } = encode_terrain_mesh(mesh, {
    short_code: "00",
    bounds: { left: -2, right: -1, top: 2, bottom: 1 },
  });
  const decoded = await decode_preview_mesh(compressed);
  assert.deepEqual(
    decoded.positions,
    decode_terrain_mesh(compressed).positions,
  );
  const normal = preview_positions(decoded, 2.5),
    flat = preview_positions(decoded, 2.5, 0);
  assert.equal(normal.positions[0], -0.5);
  assert.equal(normal.positions.at(-1), 0.5);
  assert.ok(Math.abs(normal.positions[1] - mesh.positions[1] * 0.1) < 1e-8);
  assert.equal(normal.maximum_height, mesh.maximum_height * 0.1);
  assert.equal(flat.positions[1], 0);
  assert.deepEqual(
    decoded.positions,
    mesh.positions,
    "height adjustment must not mutate cached geometry",
  );
  const calls = [],
    expected = [];
  const context = (calls) => ({
    clearRect() {},
    fillRect(...args) {
      calls.push([this.fillStyle, ...args]);
    },
  });
  paint_preview_tile(decoded, {
    width: 256,
    height: 256,
    getContext: () => context(calls),
  });
  FractoCanvasBuffer.buffer_to_canvas(source, context(expected));
  assert.deepEqual(
    calls,
    expected,
    "source canvas and texture must use the standard palette renderer",
  );
  await assert.rejects(decode_preview_mesh(new Uint8Array([1, 2, 3])));
});

function harness() {
  const requests = [],
    installs = [],
    paints = [],
    disposed = [];
  class Component {
    setState(change, callback) {
      this.state = { ...this.state, ...change };
      callback?.();
    }
  }
  const source = readFileSync(
    new URL("../src/pages/tiles/MeshTilePreview.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace("export default class", "class");
  class Scene {
    install(...args) {
      installs.push(args);
    }
    dispose() {
      disposed.push(true);
    }
  }
  const canvas = () => ({
    width: 256,
    height: 256,
    getContext: () => ({ clearRect() {}, drawImage() {} }),
  });
  const sandbox = {
    Component,
    React: { createRef: () => ({ current: canvas() }) },
    PropTypes: { string: {}, number: { isRequired: true } },
    styled: { div: () => "preview" },
    MeshTilePreviewScene: Scene,
    TILE_RENDER_WIDTH_PX: 300,
    AbortController,
    setTimeout,
    clearTimeout,
    document: { createElement: canvas },
    paint_preview_tile: (...args) => paints.push(args),
    decode_preview_mesh: async (value) => value,
    TilesBackend: {
      mesh_file: (code, options) =>
        new Promise((resolve, reject) =>
          requests.push({ code, options, resolve, reject }),
        ),
    },
  };
  vm.runInNewContext(
    transformSync(source + "\nglobalThis.Preview = MeshTilePreview", {
      loader: "jsx",
    }).code,
    sandbox,
  );
  const component = new sandbox.Preview();
  component.props = { short_code: null, scope: 2.5 };
  component.componentDidMount();
  return { component, requests, installs, paints, disposed };
}

test("preview cancels superseded tiles, keeps both canvases synchronized and disposes on unmount", async () => {
  const h = harness();
  assert.equal(h.requests.length, 0);
  h.component.props.short_code = "00";
  const first = h.component.load();
  h.component.props.short_code = "01";
  const second = h.component.load();
  assert.equal(h.requests[0].options.signal.aborted, true);
  h.requests[1].resolve({ metadata: { short_code: "01" } });
  await second;
  h.requests[0].resolve({ metadata: { short_code: "00" } });
  await first;
  assert.equal(h.component.state.displayed, "01");
  assert.equal(h.paints.length, 1);
  assert.equal(h.installs.length, 1);
  h.component.change_height({ target: { value: "0.5" } });
  assert.equal(h.installs.at(-1)[3], 0.5);
  const pending = h.component.load();
  h.component.componentWillUnmount();
  assert.equal(h.requests[2].options.signal.aborted, true);
  h.requests[2].resolve({ metadata: { short_code: "01" } });
  await pending;
  assert.equal(h.installs.length, 2);
  assert.equal(h.disposed.length, 1);
});

test("preview failures leave batch operation independent and recover with the next published mesh", async () => {
  const h = harness();
  h.component.props.short_code = "00";
  const failed = h.component.load();
  h.requests[0].reject(new Error("HTTP 404"));
  await failed;
  assert.equal(h.component.state.status, "preview_failed");
  h.component.props.short_code = "01";
  const next = h.component.load();
  h.requests[1].resolve({ metadata: { short_code: "01" } });
  await next;
  assert.equal(h.component.state.status, null);
  h.component.componentWillUnmount();
});
