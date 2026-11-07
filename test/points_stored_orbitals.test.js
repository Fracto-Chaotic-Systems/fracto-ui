import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const selected = (id) => ({
  id,
  core_point: JSON.stringify({ x: `0.${id}1234567890123456789`, y: "0.2" }),
});
const orbital = {
  orbital_id: "1",
  free_bailiwick_id: "55",
  period: 1,
  points: [
    {
      point_index: 0,
      point: { re: "0.1234567890123456789012345", im: "0.75" },
      landing_ratios: [{ numerator: "1", denominator: "7" }],
    },
  ],
};
const strip = (path) =>
  readFileSync(new URL(path, import.meta.url), "utf8").replace(
    /^import[\s\S]*?;\r?\n/gm,
    "",
  );
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

function harness(backend = {}, selection = selected(55)) {
  const timers = new Map();
  let timer_id = 0;
  const code = strip("../src/pages/study/points/PointsStoredOrbitals.jsx")
    .replace(
      "export default class PointsStoredOrbitals",
      "class PointsStoredOrbitals",
    )
    .replace("export const selected_core_point", "const selected_core_point");
  const Panel = runInNewContext(
    transformSync(code, { loader: "jsx" }).code + ";PointsStoredOrbitals",
    {
      React,
      Component: class {
        constructor(props) {
          this.props = props;
        }
        setState(update) {
          Object.assign(this.state, update);
        }
      },
      DataBackend: backend,
      PointsStoredOrbitalsView: "view",
      AbortController,
      setTimeout: (fn) => {
        timers.set(++timer_id, fn);
        return timer_id;
      },
      clearTimeout: (id) => timers.delete(id),
    },
  );
  const panel = new Panel({ selected_minibrot: selection });
  panel.is_mounted = true;
  return {
    panel,
    timers,
    tick: async () => {
      const [id, fn] = timers.entries().next().value;
      timers.delete(id);
      await fn();
    },
  };
}

test("selection loads stored progressions using exact core coordinates and no automatic calculations", async () => {
  const calls = [];
  const h = harness({
    stored_orbitals: async (core) => {
      calls.push(core);
      return { result: [{ id: "1" }] };
    },
    stored_orbital: async (id) => {
      assert.equal(id, "1");
      return { result: orbital };
    },
    calculate_bailiwick_orbitals: () =>
      assert.fail("selection must not calculate"),
  });
  await h.panel.load();
  assert.equal(calls[0].x, "0.551234567890123456789");
  assert.equal(h.panel.state.status, "ready");
  assert.equal(
    h.panel.state.orbitals[0].points[0].point.re,
    orbital.points[0].point.re,
  );
  h.panel.componentWillUnmount();
});

test("a complete ranked survey with 100 orbitals loads once without requesting another page", async () => {
  let reads = 0;
  const headers = Array.from({ length: 100 }, (_, rank) => ({ id: String(rank + 1) }));
  const h = harness({
    stored_orbitals: async () => {
      reads++;
      return { result: headers };
    },
    stored_orbital: async (id) => ({ result: { ...orbital, orbital_id: id } }),
  });
  await h.panel.load();
  assert.equal(reads, 1);
  assert.equal(h.panel.state.status, "ready");
  assert.deepEqual(Array.from(h.panel.state.orbitals, o => o.orbital_id), headers.map(h => h.id));
  h.panel.componentWillUnmount();
});

test("empty storage calculates only the selected bailiwick on action, polls, and reloads saved results", async () => {
  let finished = false,
    polls = 0,
    starts = 0;
  const h = harness({
    stored_orbitals: async () => ({ result: finished ? [{ id: "1" }] : [] }),
    stored_orbital: async () => ({ result: orbital }),
    calculate_bailiwick_orbitals: async (id) => {
      starts++;
      assert.equal(id, 55);
      return { result: { id: "job-55" } };
    },
    orbital_discovery_job: async (id) => {
      assert.equal(id, "job-55");
      if (++polls === 1) return { result: { status: "running" } };
      finished = true;
      return { result: { status: "partial", results: [{ orbital_id: "1" }] } };
    },
  });
  await h.panel.load();
  assert.equal(starts, 0);
  assert.equal(h.panel.state.orbitals.length, 0);
  await h.panel.calculate();
  await h.panel.calculate();
  assert.equal(starts, 1);
  assert.equal(h.panel.state.status, "calculating");
  await h.tick();
  assert.equal(h.panel.state.status, "ready");
  assert.equal(h.panel.state.notice, "partial");
  assert.equal(h.panel.state.orbitals.length, 1);
  h.panel.componentWillUnmount();
});

test("late lookup and calculation responses cannot replace a newer selection", async () => {
  const old = deferred(),
    start = deferred();
  let reads = 0,
    polls = 0;
  const h = harness({
    stored_orbitals: async () => (++reads === 1 ? old.promise : { result: [] }),
    calculate_bailiwick_orbitals: async () => start.promise,
    orbital_discovery_job: async () => {
      polls++;
      return { result: { status: "running" } };
    },
  });
  const load = h.panel.load(),
    old_signal = h.panel.controller.signal;
  h.panel.props = { selected_minibrot: selected(56) };
  await h.panel.load();
  old.resolve({ result: [{ id: "old" }] });
  await load;
  assert.equal(old_signal.aborted, true);
  assert.equal(h.panel.state.focal_point.x, "0.561234567890123456789");
  assert.equal(h.panel.state.orbitals.length, 0);
  const calculate = h.panel.calculate();
  h.panel.props = { selected_minibrot: selected(57) };
  await h.panel.load();
  start.resolve({ result: { id: "obsolete-job" } });
  await calculate;
  assert.equal(polls, 0);
  assert.equal(h.panel.state.status, "ready");
  h.panel.componentWillUnmount();
});

test("failed reads do not offer calculation as though the dataset were empty", async () => {
  const h = harness({
    stored_orbitals: async () => {
      throw Error("unavailable");
    },
  });
  await h.panel.load();
  assert.equal(h.panel.state.status, "error");
  assert.equal(h.panel.state.error_kind, "load");
  h.panel.componentWillUnmount();
  const invalid = harness({}, { id: 55, core_point: "invalid" });
  await invalid.panel.load();
  assert.equal(invalid.panel.state.error_kind, "core");
  invalid.panel.componentWillUnmount();
});

test("unmount aborts reads and removes pending job polling", async () => {
  const h = harness({
    stored_orbitals: async () => ({ result: [] }),
    calculate_bailiwick_orbitals: async () => ({ result: { id: "job" } }),
    orbital_discovery_job: async () => ({ result: { status: "running" } }),
  });
  await h.panel.load();
  await h.panel.calculate();
  assert.equal(h.timers.size, 1);
  const signal = h.panel.controller.signal;
  h.panel.componentWillUnmount();
  assert.equal(h.timers.size, 0);
  assert.equal(signal.aborted, true);
});

test("stored view shows exact progression coordinates and ratios, and only empty state offers calculation", () => {
  const text_keys = [
    "title",
    "select",
    "core",
    "loading",
    "calculating",
    "partial",
    "invalid_core",
    "calculate_error",
    "load_error",
    "reload",
    "empty",
    "calculate",
    "summary",
    "point",
    "real",
    "imaginary",
    "ratios",
    "stale",
    "recalculate",
    "confirmation",
    "survey_progress",
    "scan_progress",
    "ray_progress",
  ];
  const keys = Object.fromEntries(text_keys.map((key) => [key, key]));
  const View = runInNewContext(
    transformSync(
      strip("../src/pages/study/points/PointsStoredOrbitalsView.jsx").replace(
        "export default function PointsStoredOrbitalsView",
        "function PointsStoredOrbitalsView",
      ),
      { loader: "jsx" },
    ).code + ";PointsStoredOrbitalsView",
    {
      React,
      styled: { div: () => "div" },
      POINTS_ORBITAL_TEXT: keys,
      AppText: {
        get: (key) =>
          key === "summary"
            ? "Orbital #{id} period {period} ratios {ratios}"
            : key === "confirmation"
              ? "Confidence {confidence}% discoveries {discoveries}"
              : key === "ray_progress"
                ? "Rays {processed}/{total}; families {families}/{family_limit}"
                : key,
      },
    },
  );
  const props = {
    status: "ready",
    orbitals: [orbital],
    on_calculate() {},
    on_reload() {},
  };
  const stored = renderToStaticMarkup(React.createElement(View, props));
  assert.match(stored, /Orbital #1 period 1 ratios 1/);
  assert.match(stored, /0\.1234567890123456789012345/);
  assert.match(stored, /1\/7/);
  assert.doesNotMatch(stored, /<a/);
  assert.match(
    renderToStaticMarkup(React.createElement(View, { ...props, orbitals: [] })),
    />calculate<\/a>/,
  );
  const error = renderToStaticMarkup(
    React.createElement(View, {
      ...props,
      status: "error",
      error_kind: "load",
      orbitals: [],
    }),
  );
  assert.doesNotMatch(error, />calculate<\/a>/);
  const stale = renderToStaticMarkup(
    React.createElement(View, { ...props, orbitals: [], stale: true }),
  );
  assert.match(stale, />recalculate<\/a>/);
  assert.match(stale, />stale<\/p>/);
  const confirmed = renderToStaticMarkup(
    React.createElement(View, {
      ...props,
      orbitals: [
        {
          ...orbital,
          discovery_metadata: { confidence: 1, discovery_count: 49 },
        },
      ],
    }),
  );
  assert.match(confirmed, /Confidence 100.00% discoveries 49/);
  const progress = renderToStaticMarkup(
    React.createElement(View, {
      ...props,
      status: "calculating",
      orbitals: [],
      progress: {
        phase: "rays",
        ray_orbitals_processed: 3,
        ray_orbitals_total: 10,
        ray_families_processed: 5,
        ray_families_total: 1024,
      },
    }),
  );
  assert.match(progress, /Rays 3\/10; families 5\/1024/);
});
