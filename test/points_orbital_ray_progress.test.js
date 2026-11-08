import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const labels = {
  known_ray_progress: "Tracing paths: {processed} of {total}",
  known_ray_loading: "Tracing known landing rays",
  known_ray_cache_loading: "Loading saved ray paths…",
  known_ray_cancel: "Cancel tracing",
  known_ray_retry: "Trace remaining paths",
  known_ray_cancelled: "Path tracing canceled.",
  known_ray_failed: "Unable to trace ray paths.",
  known_ray_unresolved: "Some ray paths could not be verified.",
  known_ray_cache_failed: "Paths could not be saved for later.",
};
const source = readFileSync(
  new URL(
    "../src/pages/study/points/PointsOrbitalRayProgress.jsx",
    import.meta.url,
  ),
  "utf8",
)
  .replace(/^import[\s\S]*?;\r?\n/gm, "")
  .replace("export default function", "function");
const Progress = runInNewContext(
  transformSync(source, { loader: "jsx" }).code + ";PointsOrbitalRayProgress",
  {
    React,
    AppText: { get: (key) => labels[key] },
    POINTS_ORBITAL_TEXT: Object.fromEntries(
      Object.keys(labels).map((key) => [key, key]),
    ),
  },
);
const render = (props) =>
  renderToStaticMarkup(
    React.createElement(Progress, {
      running: false,
      loading_cache: false,
      processed: 0,
      total: 0,
      ...props,
    }),
  );

test("path progress counts remaining work and offers cancellation only during active tracing", () => {
  const markup = render({ running: true, processed: 3, total: 8 });
  assert.match(markup, /Tracing paths: 3 of 8/);
  assert.match(markup, /aria-valuetext="Tracing paths: 3 of 8"/);
  assert.match(markup, /max="8" value="3"/);
  assert.match(markup, />Cancel tracing<\/button>/);
  assert.doesNotMatch(markup, /Trace remaining paths/);
});

test("cache lookups show a message without a tracing bar and completed renders leave no lingering status", () => {
  const lookup = render({ running: true, loading_cache: true, total: 8 });
  assert.match(lookup, /Loading saved ray paths/);
  assert.doesNotMatch(lookup, /<progress|<button/);
  assert.equal(render({ status: "rays_found", processed: 8, total: 8 }), "");
});

test("canceled, failed, partial, and save-failure outcomes remain clear without a false loading bar", () => {
  for (const [status, message] of [
    ["cancelled", "Path tracing canceled"],
    ["failed", "Unable to trace"],
    ["partial", "could not be verified"],
  ]) {
    const markup = render({ status });
    assert.ok(markup.includes(message));
    assert.match(markup, />Trace remaining paths<\/button>/);
    assert.doesNotMatch(markup, /<progress/);
  }
  const warning = render({ status: "rays_found", cache_error: true });
  assert.match(warning, /Paths could not be saved for later/);
  assert.doesNotMatch(warning, /<progress/);
});
