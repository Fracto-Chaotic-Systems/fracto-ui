import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  orbital_selectable,
  orbital_ratio_label,
} from "../src/pages/study/points/PointsOrbitalState.js";

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
      DataBackend: {
        bailiwick_orbital_job: async () => ({ result: null }),
        ...backend,
      },
      PointsStoredOrbitalsView: "view",
      orbital_selectable,
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
  const headers = Array.from({ length: 100 }, (_, rank) => ({
    id: String(rank + 1),
  }));
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
  assert.deepEqual(
    Array.from(h.panel.state.orbitals, (o) => o.orbital_id),
    headers.map((h) => h.id),
  );
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
      if (++polls === 1)
        return {
          result: {
            status: "running",
            stage: "discovering",
            progress: {
              phase: "survey",
              survey_processed: 100,
              survey_total: 62500,
            },
          },
        };
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
  assert.equal(h.panel.state.progress.stage, "discovering");
  assert.equal(h.panel.state.progress.survey_processed, 100);
  await h.tick();
  assert.equal(h.panel.state.status, "ready");
  assert.equal(h.panel.state.notice, "partial");
  assert.equal(h.panel.state.orbitals.length, 1);
  h.panel.componentWillUnmount();
});

test("late lookup and calculation responses cannot replace a newer selection", async () => {
  const old = deferred(),
    start = deferred(),
    read_started = deferred();
  let reads = 0,
    polls = 0;
  const h = harness({
    stored_orbitals: async () => {
      if (++reads === 1) {
        read_started.resolve();
        return old.promise;
      }
      return { result: [] };
    },
    calculate_bailiwick_orbitals: async () => start.promise,
    orbital_discovery_job: async () => {
      polls++;
      return { result: { status: "running" } };
    },
  });
  const load = h.panel.load(),
    old_signal = h.panel.controller.signal;
  await read_started.promise;
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

test("orbital selection defaults to the first result, propagates changes, and clears on reload", async () => {
  const second = { ...orbital, orbital_id: "2" };
  const h = harness({
    stored_orbitals: async () => ({ result: [{ id: "1" }, { id: "2" }] }),
    stored_orbital: async (id) => ({ result: id === "1" ? orbital : second }),
  });
  const selections = [];
  h.panel.props.on_select_orbital = (orbital) => selections.push(orbital);
  await h.panel.load();
  assert.equal(selections[0], null);
  assert.equal(h.panel.state.selected_orbital.orbital_id, "1");
  assert.equal(selections.at(-1).orbital_id, "1");
  h.panel.render().props.on_select_orbital(second);
  assert.equal(h.panel.state.selected_orbital, second);
  assert.equal(selections.at(-1), second);
  h.panel.props.selected_minibrot = null;
  await h.panel.load();
  assert.equal(h.panel.state.selected_orbital, null);
  assert.equal(selections.at(-1), null);
  h.panel.componentWillUnmount();
});

test("stored view shows orbital summaries without duplicate point details, and only empty state offers calculation", () => {
  const text_keys = [
    "catalog_intro",
    "catalog_results",
    "catalog_partial",
    "catalog_resume_notice",
    "paths_on_selection",
    "orbital_available",
    "orbital_pending",
    "ratios_pending",
    "ratios_unresolved",
    "ratios_not_applicable",
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
    "resume",
    "resume_notice",
    "cancel",
    "stale",
    "recalculate",
    "confirmation",
    "survey_progress",
    "scan_progress",
    "ray_progress",
    "queued",
    "saving",
    "saving_rays",
    "saving_progress",
    "survey_stage",
    "scan_stage",
    "ray_stage",
    "ray_preparing",
    "catalog_stage",
    "catalog_progress",
    "coverage_title",
    "coverage_range",
    "coverage_none",
    "coverage_counts",
    "coverage_scope",
    "coverage_details",
    "coverage_denominator",
    "coverage_investigated",
    "coverage_periods",
    "coverage_unresolved",
    "coverage_unknown",
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
      render_pattern_block: (period) =>
        React.createElement("span", { "data-pattern": period }, period),
      POINTS_ORBITAL_TEXT: keys,
      orbital_selectable,
      orbital_ratio_label,
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
  assert.match(stored, /data-pattern="1"/);
  assert.match(stored, /aria-pressed="true"/);
  assert.match(stored, /class="orbital-ratios" title="1\/7"/);
  const multiple = renderToStaticMarkup(
    React.createElement(View, {
      ...props,
      orbitals: [
        orbital,
        {
          ...orbital,
          orbital_id: "2",
          period: 2,
          points: [
            {
              ...orbital.points[0],
              landing_ratios: [
                { numerator: "1", denominator: "7" },
                { numerator: "2", denominator: "7" },
              ],
            },
            {
              ...orbital.points[0],
              point_index: 1,
              landing_ratios: [{ numerator: "4", denominator: "7" }],
            },
          ],
        },
      ],
    }),
  );
  assert.match(multiple, /data-pattern="2"/);
  assert.match(multiple, /aria-pressed="false"/);
  assert.match(multiple, /title="1\/7, 2\/7; 4\/7">1\/7, 2\/7; 4\/7<\/span>/);
  assert.doesNotMatch(stored, /0\.1234567890123456789012345|<table/);
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
  assert.doesNotMatch(confirmed, /Confidence|discoveries/);
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
  assert.match(progress, /<progress[^>]*max="1024"[^>]*value="5"/);
  assert.doesNotMatch(stored, /<progress/);
  const calculating = (progress) =>
    renderToStaticMarkup(
      React.createElement(View, {
        ...props,
        status: "calculating",
        orbitals: [],
        progress,
      }),
    );
  for (const [phase, expected, value, total] of [
    ["survey", "survey_stage", 25, 100],
    ["scan", "scan_stage", 8, 20],
  ]) {
    const markup = calculating({
      phase,
      [`${phase}_processed`]: value,
      [`${phase}_total`]: total,
    });
    assert.match(markup, new RegExp(`aria-label="${expected}"`));
    assert.match(markup, new RegExp(`max="${total}" value="${value}"`));
    assert.match(markup, new RegExp(`${Math.floor((100 * value) / total)}%`));
  }
  for (const snapshot of [
    null,
    { stage: "queued" },
    {
      stage: "calculating_rays",
      phase: "scan",
      scan_processed: 100,
      scan_total: 100,
      ray_orbitals_processed: 0,
      ray_orbitals_total: 10,
    },
    {
      stage: "calculating_rays",
      phase: "rays",
      ray_families_processed: 0,
      ray_families_total: 0,
    },
  ]) {
    const markup = calculating(snapshot);
    assert.match(markup, /<progress/);
    assert.doesNotMatch(markup, /<progress[^>]*value=/);
    assert.doesNotMatch(markup, /100%/);
  }
  const saving = calculating({
    stage: "persisting",
    phase: "scan",
    orbital_count: 2,
    expected_orbitals: 4,
  });
  assert.match(saving, /aria-label="saving"/);
  assert.match(saving, /max="4" value="2"/);
  const saving_rays = calculating({
    stage: "persisting",
    phase: "rays",
    ray_families_processed: 1024,
    ray_families_total: 1024,
  });
  assert.match(saving_rays, /aria-label="saving_rays"/);
  assert.doesNotMatch(saving_rays, /<progress[^>]*value=/);
  const bounded = calculating({
    phase: "survey",
    survey_processed: 200,
    survey_total: 100,
  });
  assert.match(bounded, /max="100" value="100"/);
  assert.doesNotMatch(error, /<progress/);
  const resumable = renderToStaticMarkup(
    React.createElement(View, { ...props, resumable: true }),
  );
  assert.match(resumable, />resume<\/a>/);
  assert.match(resumable, /resume_notice/);
  assert.doesNotMatch(resumable, />calculate<\/a>/);
  const coverage = {
    max_denominator: 7,
    investigated_families: 4,
    total_families: 5,
    validated_families: 3,
    unresolved_families: 1,
    uninvestigated_families: 1,
    cache_hits: 2,
    tested_through_denominator: 5,
    denominators: [
      {
        denominator: "7",
        investigated_families: 1,
        total_families: 2,
        candidate_orbital_periods: [1, 3],
      },
    ],
    unresolved_details: [{ family_key: "1/7", reason: "landing_mismatch" }],
  };
  const report = renderToStaticMarkup(
    React.createElement(View, { ...props, coverage }),
  );
  assert.match(report, /coverage_title/);
  assert.match(report, /<td>7<\/td><td>1 \/ 2<\/td><td>1, 3<\/td>/);
  assert.match(report, /1\/7: landing mismatch/);
  assert.match(report, /coverage_scope/);
  assert.doesNotMatch(report, /<progress/);
  const catalog_progress = calculating({
    phase: "catalog",
    stage: "persisting",
    catalog_processed: 4,
    catalog_total: 5,
    catalog_coverage: coverage,
  });
  assert.match(catalog_progress, /aria-label="catalog_stage"/);
  assert.match(catalog_progress, /max="5" value="4"/);
  assert.match(catalog_progress, /coverage_details/);
});

test("saved coverage survives reload and active job coverage takes precedence", async () => {
  let active = false;
  const saved = { max_denominator: 7 },
    current = { max_denominator: 15 };
  const h = harness({
    stored_orbitals: async () => ({ result: [], coverage: saved }),
    bailiwick_orbital_job: async () => ({
      result: active
        ? {
            id: "interrupted",
            status: "partial",
            resumable: true,
            progress: { catalog_coverage: current },
          }
        : null,
    }),
  });
  await h.panel.load();
  assert.equal(h.panel.state.coverage, saved);
  active = true;
  await h.panel.load();
  assert.equal(h.panel.state.coverage, current);
  assert.equal(h.panel.state.resumable, true);
  h.panel.componentWillUnmount();
});

test("selection reattaches to an active job without starting another calculation", async () => {
  let polls = 0;
  const h = harness({
    bailiwick_orbital_job: async () => ({
      result: { id: "existing", status: "running" },
    }),
    stored_orbitals: async () => ({ result: [] }),
    calculate_bailiwick_orbitals: () =>
      assert.fail("active jobs must be attached"),
    orbital_discovery_job: async (id) => {
      assert.equal(id, "existing");
      polls++;
      return {
        result: {
          status: "running",
          stage: "calculating_rays",
          progress: {
            phase: "rays",
            ray_orbitals_processed: 3,
            ray_orbitals_total: 10,
          },
        },
      };
    },
  });
  await h.panel.load();
  assert.equal(h.panel.state.status, "calculating");
  assert.equal(h.panel.state.job_id, "existing");
  assert.equal(h.panel.state.progress.ray_orbitals_processed, 3);
  assert.equal(polls, 1);
  h.panel.componentWillUnmount();
});

test("catalog jobs publish selectable pending orbitals live and preserve selection through progress and completion", async () => {
  let counter = 1,
    status = "running",
    reads = 0;
  const invalid = {
    ...orbital,
    orbital_id: "0",
    selectable: false,
    lifecycle_state: { orbital: "pending", assignments: "pending" },
  };
  let pending = {
    ...orbital,
    orbital_id: "2",
    selectable: true,
    lifecycle_state: { orbital: "validated", assignments: "pending" },
    points: orbital.points.map((point) => ({ ...point, landing_ratios: [] })),
  };
  const third = {
    ...orbital,
    orbital_id: "3",
    selectable: true,
    lifecycle_state: { orbital: "validated", assignments: "verified" },
  };
  let details = [invalid, pending];
  const job = () => ({
    id: "catalog-job",
    status,
    stage: "discovering",
    discovery_strategy: "catalog-representative-rays-v1",
    progress: {
      phase: "catalog",
      catalog_processed: counter,
      catalog_total: 5,
    },
    results: details.map((row) => ({
      orbital_id: row.orbital_id,
      discovery_metadata: { catalog: { family_keys: [row.orbital_id] } },
    })),
  });
  const h = harness({
    bailiwick_orbital_job: async () => ({ result: job() }),
    orbital_discovery_job: async () => ({ result: job() }),
    stored_orbitals: async () => ({
      result: details.map((row) => ({ id: row.orbital_id })),
    }),
    stored_orbital: async (id) => {
      reads++;
      return { result: details.find((row) => row.orbital_id === id) };
    },
  });
  const selections = [];
  h.panel.props.on_select_orbital = (selected) => selections.push(selected);
  await h.panel.load();
  assert.equal(h.panel.state.status, "calculating");
  assert.equal(h.panel.state.orbitals.length, 2);
  assert.equal(h.panel.state.selected_orbital.orbital_id, "2");
  assert.equal(reads, 2, "unchanged poll reuses details");
  h.panel.select_orbital(invalid);
  assert.equal(h.panel.state.selected_orbital.orbital_id, "2");
  pending = {
    ...pending,
    lifecycle_state: { orbital: "validated", assignments: "verified" },
    points: orbital.points,
  };
  details = [invalid, pending, third];
  counter++;
  await h.tick();
  assert.equal(h.panel.state.orbitals.length, 3);
  assert.equal(h.panel.state.selected_orbital.orbital_id, "2");
  assert.equal(
    h.panel.state.selected_orbital.lifecycle_state.assignments,
    "verified",
  );
  const before = selections.length,
    same = h.panel.state.selected_orbital;
  await h.tick();
  assert.equal(h.panel.state.selected_orbital, same);
  assert.equal(
    selections.length,
    before,
    "unchanged results do not restart overlays or animation",
  );
  status = "completed";
  await h.tick();
  assert.equal(h.panel.state.status, "ready");
  assert.equal(h.panel.state.selected_orbital.orbital_id, "2");
  assert.ok(
    selections.slice(1).every(Boolean),
    "completion does not clear the active orbital",
  );
  h.panel.componentWillUnmount();
});

test("interrupted work offers resume even with stored results and cancellation keeps the same job resumable", async () => {
  let status = "interrupted",
    starts = 0,
    cancels = 0;
  const h = harness({
    bailiwick_orbital_job: async () => ({
      result: { id: "same-job", status, resumable: status !== "running" },
    }),
    stored_orbitals: async () => ({ result: [{ id: "1" }] }),
    stored_orbital: async () => ({ result: orbital }),
    resume_bailiwick_orbitals: async (id, job) => {
      assert.equal(id, 55);
      assert.equal(job, "same-job");
      starts++;
      status = "running";
      return { result: { id: "same-job" } };
    },
    calculate_bailiwick_orbitals: () =>
      assert.fail("resume must target the selected job UUID"),
    orbital_discovery_job: async (id) => ({
      result: {
        id,
        status,
        stage: "discovering",
        progress: { phase: "scan", scan_processed: 64, scan_total: 146 },
      },
    }),
    cancel_bailiwick_orbitals: async (id, job) => {
      assert.equal(id, 55);
      assert.equal(job, "same-job");
      cancels++;
      status = "cancelled";
      return { result: { id: job, status, resumable: true } };
    },
  });
  await h.panel.load();
  assert.equal(h.panel.state.resumable, true);
  assert.equal(h.panel.state.orbitals.length, 1);
  await h.panel.calculate();
  assert.equal(starts, 1);
  assert.equal(h.panel.state.progress.scan_processed, 64);
  await h.panel.cancel();
  assert.equal(cancels, 1);
  assert.equal(h.panel.state.status, "ready");
  assert.equal(h.panel.state.resumable, true);
  assert.equal(h.panel.state.job_id, "same-job");
  h.panel.componentWillUnmount();
});
