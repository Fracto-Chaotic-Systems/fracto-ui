import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";

test("known-ray worker follows selection, streams progress, rejects late results, and cleans up", async () => {
  const workers = [],
    paints = [];
  const source = readFileSync(
    new URL("../src/pages/study/points/PointsOrbitalRays.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace("export default class", "class")
    .replace(
      'new URL("./PointsOrbitalRays.worker.js", import.meta.url)',
      '"worker.js"',
    );
  const Controller = runInNewContext(
    transformSync(source, { loader: "jsx" }).code + ";PointsOrbitalRays",
    {
      Component: class {
        constructor(props) {
          this.props = props;
        }
        setState(update) {
          Object.assign(this.state, update);
        }
      },
      Worker: class {
        constructor() {
          workers.push(this);
        }
        terminate() {
          this.stopped = true;
        }
        postMessage(message) {
          this.message = message;
        }
      },
      React: {
        createElement: (type, props, ...children) => ({
          type,
          props,
          children,
        }),
      },
      AppText: { get: () => "Tracing paths: {processed} of {total}" },
      POINTS_ORBITAL_TEXT: {},
      PointsOrbitalRayProgress: "progress",
      OrbitalRayStorage: class {
        async load() {
          return null;
        }
        async save() {}
      },
      cached_orbital_rays: () => [],
    },
  );
  const request = { requests: [{ angle: "0/1" }] };
  const view = new Controller({
    trace_request: request,
    on_rays: (rays) => paints.push(rays),
  });
  await view.componentDidMount();
  assert.equal(workers.length, 1);
  assert.equal(view.state.running, true);
  const first = workers[0];
  const id = first.message.id;
  first.onmessage({
    data: {
      id,
      progress: { processed: 1, total: 1, rays: [{ angle: { key: "first" } }] },
    },
  });
  assert.equal(paints.at(-1)[0].angle.key, "first");
  view.render().props.on_cancel();
  assert.equal(first.stopped, true);
  assert.equal(view.state.running, false);
  assert.equal(view.state.status, "cancelled");
  assert.equal(
    paints.at(-1)[0].angle.key,
    "first",
    "cancel preserves validated paths",
  );
  first.onmessage({
    data: { id, result: { status: "rays_found", rays: ["late"] } },
  });
  assert.equal(paints.at(-1)[0].angle.key, "first");
  await view.render().props.on_retry();
  assert.equal(workers.length, 2);
  assert.equal(view.state.running, true);
  const previous = view.props;
  view.props = { ...previous, trace_request: { requests: [{ angle: "1/3" }] } };
  await view.componentDidUpdate(previous);
  assert.equal(first.stopped, true);
  assert.equal(workers[1].stopped, true);
  first.onmessage({
    data: { id, result: { status: "rays_found", rays: ["stale"] } },
  });
  assert.equal(paints.at(-1).length, 0);
  const second = workers[2];
  second.onmessage({
    data: {
      id: second.message.id,
      result: { status: "rays_found", rays: [{ angle: { key: "second" } }] },
    },
  });
  assert.equal(view.state.running, false);
  assert.equal(paints.at(-1)[0].angle.key, "second");
  assert.equal(view.render(), null);
  const finished = view.props;
  view.props = { ...finished, trace_request: { requests: [] } };
  await view.componentDidUpdate(finished);
  assert.equal(workers.length, 3);
  assert.equal(paints.at(-1).length, 0);
  view.componentWillUnmount();
});

test("complete persistent hits skip workers and late cache reads cannot repaint a newer selection", async () => {
  const workers = [],
    paints = [],
    pending = [];
  const source = readFileSync(
    new URL("../src/pages/study/points/PointsOrbitalRays.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace("export default class", "class")
    .replace(
      'new URL("./PointsOrbitalRays.worker.js", import.meta.url)',
      '"worker.js"',
    );
  const Controller = runInNewContext(
    transformSync(source, { loader: "jsx" }).code + ";PointsOrbitalRays",
    {
      Component: class {
        constructor(props) {
          this.props = props;
        }
        setState(update) {
          Object.assign(this.state, update);
        }
      },
      Worker: class {
        constructor() {
          workers.push(this);
        }
      },
      OrbitalRayStorage: class {
        load() {
          return new Promise((resolve) => pending.push(resolve));
        }
      },
      cached_orbital_rays: (cache) => cache,
      React: { createElement: () => null },
      AppText: { get: () => "" },
      POINTS_ORBITAL_TEXT: {},
    },
  );
  const view = new Controller({
    trace_request: { requests: [{}] },
    on_rays: (rays) => paints.push(rays),
  });
  const first = view.componentDidMount();
  const previous = view.props;
  view.props = {
    ...previous,
    trace_request: { orbital_id: "new", requests: [{}] },
  };
  const second = view.componentDidUpdate(previous);
  pending[0]([{ angle: { key: "stale" } }]);
  await first;
  assert.equal(paints.at(-1).length, 0);
  pending[1]([{ angle: { key: "saved" } }]);
  await second;
  assert.equal(workers.length, 0);
  assert.equal(paints.at(-1)[0].angle.key, "saved");
  assert.equal(view.state.running, false);
  assert.equal(view.render(), null);
  view.componentWillUnmount();
});

test("partial cache hits paint first and trace/save only missing accesses with remaining-work progress", async () => {
  const workers = [],
    paints = [],
    writes = [],
    storage_requests = [];
  const source = readFileSync(
    new URL("../src/pages/study/points/PointsOrbitalRays.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace("export default class", "class")
    .replace(
      'new URL("./PointsOrbitalRays.worker.js", import.meta.url)',
      '"worker.js"',
    );
  const saved = { angle: { key: "0/1" } };
  const Controller = runInNewContext(
    transformSync(source, { loader: "jsx" }).code + ";PointsOrbitalRays",
    {
      Component: class {
        constructor(props) {
          this.props = props;
        }
        setState(update) {
          Object.assign(this.state, update);
        }
      },
      Worker: class {
        constructor() {
          workers.push(this);
        }
        postMessage(message) {
          this.message = message;
        }
        terminate() {
          this.stopped = true;
        }
      },
      OrbitalRayStorage: class {
        constructor(request) {
          storage_requests.push(request);
        }
        async load() {
          return [saved];
        }
        async save(rays) {
          writes.push(rays);
        }
      },
      cached_orbital_rays: (cache) => cache,
      React: {
        createElement: (type, props, ...children) => ({
          type,
          props,
          children,
        }),
      },
      AppText: { get: () => "Tracing paths: {processed} of {total}" },
      POINTS_ORBITAL_TEXT: {},
    },
  );
  const request = {
    orbital_id: "42",
    period: 1,
    focal_point: { x: "0.1234567890123456789", y: "0" },
    orbital_points: [{ re: "1", im: "0" }],
    requests: ["0/1", "1/3", "2/3"].map((key) => ({ angle: { key } })),
  };
  const view = new Controller({
    trace_request: request,
    on_rays: (rays) => paints.push(rays),
  });
  await view.componentDidMount();
  assert.equal(paints.at(-1)[0], saved);
  assert.equal(
    storage_requests[0],
    request,
    "saves remain bound to the complete orbital identity",
  );
  const worker = workers[0],
    pending = worker.message.request,
    id = worker.message.id;
  assert.deepEqual(
    Array.from(pending.requests, (r) => r.angle.key),
    ["1/3", "2/3"],
  );
  assert.equal(pending.orbital_points, request.orbital_points);
  assert.equal(pending.focal_point, request.focal_point);
  assert.equal(
    request.requests.length,
    3,
    "the original cache identity is unchanged",
  );
  assert.equal(view.state.processed, 0);
  assert.equal(view.state.total, 2);
  const traced = pending.requests.map((access) => ({ angle: access.angle }));
  worker.onmessage({
    data: { id, progress: { processed: 2, total: 2, rays: traced } },
  });
  assert.deepEqual(
    Array.from(paints.at(-1), (r) => r.angle.key),
    ["0/1", "1/3", "2/3"],
  );
  assert.equal(view.state.processed, 2);
  assert.equal(writes.length, 1);
  assert.deepEqual(
    Array.from(writes[0], (r) => r.angle.key),
    ["1/3", "2/3"],
  );
  worker.onmessage({
    data: { id, result: { status: "rays_found", rays: traced } },
  });
  assert.equal(
    writes.length,
    1,
    "final result does not duplicate incremental saves",
  );
  assert.equal(view.state.running, false);
  assert.equal(paints.at(-1).length, 3);
  assert.equal(worker.stopped, true);
  view.componentWillUnmount();
});

test("failed refinement leaves valid cached families visible", async () => {
  const workers = [],
    paints = [];
  const source = readFileSync(
    new URL("../src/pages/study/points/PointsOrbitalRays.jsx", import.meta.url),
    "utf8",
  )
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace("export default class", "class")
    .replace(
      'new URL("./PointsOrbitalRays.worker.js", import.meta.url)',
      '"worker.js"',
    );
  const saved = { angle: { key: "0/1" } };
  const Controller = runInNewContext(
    transformSync(source, { loader: "jsx" }).code + ";PointsOrbitalRays",
    {
      Component: class {
        constructor(props) {
          this.props = props;
        }
        setState(update) {
          Object.assign(this.state, update);
        }
      },
      Worker: class {
        constructor() {
          workers.push(this);
        }
        postMessage(message) {
          this.message = message;
        }
        terminate() {}
      },
      OrbitalRayStorage: class {
        async load() {
          return [saved];
        }
      },
      cached_orbital_rays: (cache) => cache,
      React: {},
      AppText: {},
      POINTS_ORBITAL_TEXT: {},
    },
  );
  const view = new Controller({
    trace_request: {
      requests: ["0/1", "1/3", "2/3"].map((key) => ({ angle: { key } })),
    },
    on_rays: (rays) => paints.push(rays),
  });
  await view.componentDidMount();
  workers[0].onmessage({
    data: { id: workers[0].message.id, error: "trace failed" },
  });
  assert.equal(paints.at(-1)[0], saved);
  assert.equal(paints.at(-1).length, 1);
  assert.equal(view.state.running, false);
  assert.equal(view.state.status, "failed");
  view.componentWillUnmount();
});
