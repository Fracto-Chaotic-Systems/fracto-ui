import test from "node:test";
import {
  ordered_orbital_points,
  format_landing_ratios,
} from "../src/pages/study/points/PointsOrbitalOrder.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  orbital_selectable,
  orbital_ratio_label,
} from "../src/pages/study/points/PointsOrbitalState.js";
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const { POINTS_ORBITAL_TEXT, APP_STUDY_TEXT } = runInNewContext(
  read("../src/text/StudyText.jsx").replace(/^export /gm, "") +
    ";({POINTS_ORBITAL_TEXT,APP_STUDY_TEXT})",
);
const scope = {
  React,
  ordered_orbital_points,
  format_landing_ratios,
  orbital_selectable,
  orbital_ratio_label,
  POINTS_ORBITAL_TEXT,
  AppText: { get: (key) => APP_STUDY_TEXT[key] },
  styled: { div: () => "div" },
  render_pattern_block: (period) => React.createElement("span", null, period),
};
const component = (file, name) =>
  runInNewContext(
    transformSync(
      read(`../src/pages/study/points/${file}`)
        .replace(/^import[\s\S]*?;\r?\n/gm, "")
        .replace(`export default function ${name}`, `function ${name}`),
      { loader: "jsx" },
    ).code + `;${name}`,
    scope,
  );
const View = component(
  "PointsStoredOrbitalsView.jsx",
  "PointsStoredOrbitalsView",
);
const Progress = runInNewContext(
  transformSync(
    read("../src/pages/study/points/PointsOrbitalRayProgress.jsx")
      .replace(/^import[\s\S]*?;\r?\n/gm, "")
      .replace("export default function", "function"),
    { loader: "jsx" },
  ).code + ";PointsOrbitalRayProgress",
  { ...scope },
);
const render = (type, props) =>
  renderToStaticMarkup(React.createElement(type, props));
const pending = {
  orbital_id: "2",
  period: 3,
  selectable: true,
  lifecycle_state: { orbital: "validated", assignments: "pending" },
  points: [{ point_index: 0, point: { re: "1", im: "0" }, landing_ratios: [] }],
};

test("orbital ratio summaries rotate point groups and preserve cycle progression", () => {
  const points = ["8", "1", "4", "2"].map((numerator, point_index) => ({
    point_index,
    landing_ratios: [{ numerator, denominator: "15" }],
  }));
  points[1].landing_ratios.unshift({ numerator: "7", denominator: "15" });
  const html = render(View, {
    status: "ready",
    orbitals: [{ ...pending, points }],
  });
  assert.match(html, /1\/15, 7\/15; 4\/15; 2\/15; 8\/15/);
});
test("catalog discovery reports families separately from paths and keeps pending assignments selectable", () => {
  const html = render(View, {
    status: "calculating",
    orbitals: [pending],
    discovery_strategy: "catalog-representative-rays-v1",
    progress: {
      phase: "catalog",
      catalog_processed: 2,
      catalog_total: 5,
      orbital_count: 1,
      catalog_accepted: 1,
      catalog_unresolved: 1,
      catalog_cache_hits: 1,
    },
  });
  assert.match(html, /Investigating denominator families/);
  assert.match(html, /2 \/ 5 families/);
  assert.match(html, /Orbitals: 1 · Ratio families verified: 1/);
  assert.match(html, /selected orbital only/);
  assert.match(html, /Landing ratios pending/);
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(
    html,
    /disabled|Surveying Julia seeds|Tracing Julia landing rays/,
  );
});
test("unvalidated rows are disabled while unresolved ratios and absent paths do not disable a validated orbital", () => {
  const invalid = {
    ...pending,
    orbital_id: "1",
    selectable: false,
    lifecycle_state: { orbital: "pending", assignments: "pending" },
  };
  const unresolved = {
    ...pending,
    lifecycle_state: {
      orbital: "validated",
      assignments: "unresolved",
      paths: { status: "missing" },
    },
  };
  const html = render(View, {
    status: "ready",
    orbitals: [invalid, unresolved],
  });
  assert.equal((html.match(/disabled=""/g) || []).length, 1);
  assert.match(html, /No verified landing ratios available/);
  assert.equal(orbital_selectable(unresolved), true);
  assert.equal(
    orbital_selectable({ ...pending, lifecycle_state: undefined }),
    true,
  );
});
test("pending or unavailable ratios explain point-only overlays without a false path-loading bar", () => {
  for (const state of ["pending", "unresolved", "not_applicable"]) {
    const html = render(Progress, {
      assignment_notice: orbital_ratio_label({
        ...pending,
        lifecycle_state: { orbital: "validated", assignments: state },
      }),
    });
    assert.match(
      html,
      /Landing ratios pending|No verified landing ratios|No landing rays/,
    );
    assert.doesNotMatch(html, /<progress|<button|Tracing paths/);
  }
  assert.equal(render(Progress, { status: "rays_found" }), "");
});
test("catalog resume and empty states describe discovery and selection-time paths", () => {
  const empty = render(View, { status: "ready", orbitals: [] });
  assert.match(empty, /Discover orbitals for this focal point/);
  assert.match(empty, /Ray paths load when you select an orbital/);
  assert.doesNotMatch(empty, /Seed Surveys method/);
  const stopped = render(View, {
    status: "ready",
    orbitals: [pending],
    resumable: true,
    notice: "partial",
    discovery_strategy: "catalog-representative-rays-v1",
  });
  assert.match(stopped, /last saved family/);
  assert.match(stopped, /remain unresolved or uninvestigated/);
  const repairable = render(View, {
    status: "ready",
    orbitals: [pending],
    resumable: true,
    confirmation_repair_available: true,
    discovery_strategy: "catalog-representative-rays-v1",
  });
  assert.match(repairable, /Previously limited families can now be retried/);
  assert.match(repairable, /Verified orbitals will be reused/);
});

test("confirmation repair progress counts its retry queue instead of showing a finished catalog bar", () => {
  const html = render(View, {
    status: "calculating",
    orbitals: [pending],
    discovery_strategy: "catalog-representative-rays-v1",
    progress: {
      phase: "catalog",
      catalog_processed: 412,
      catalog_total: 412,
      catalog_confirmation_retries: 3,
      catalog_confirmation_retry_total: 10,
    },
  });
  assert.match(html, /Retrying numerical confirmations/);
  assert.match(html, /3 \/ 10 previously limited families retried/);
  assert.match(html, /max="10" value="3"/);
  assert.doesNotMatch(html, /100%/);
});

test("generated lists offer re-discovery alongside resume while active jobs retain their own controls", () => {
  const ready = render(View, { status: "ready", orbitals: [pending] });
  assert.match(ready, />Re-discover orbitals<\/a>/);
  assert.match(
    render(View, { status: "ready", orbitals: [pending], resumable: true }),
    />Re-discover orbitals<\/a>/,
  );
  for (const props of [
    { status: "loading" },
    { status: "calculating" },
    { status: "ready", orbitals: [] },
  ]) {
    assert.doesNotMatch(
      render(View, { status: "ready", orbitals: [pending], ...props }),
      />Re-discover orbitals<\/a>/,
    );
  }
  const failed = render(View, {
    status: "error",
    error_kind: "calculate",
    orbitals: [pending],
  });
  assert.match(failed, /Unable to finish the calculation/);
  assert.doesNotMatch(failed, /No stored orbitals/);
});
