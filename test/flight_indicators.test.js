import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as indicators from "flight-indicators";

const cases = [
  ["Airspeed", { speed: 180, max: 300, arcs: {}, unit: "KNOTS" }],
  ["AttitudeIndicator", { roll: 25, pitch: -15, pitchLimit: 60 }],
  ["HeadingIndicator", { heading: 359 }],
  ["Altimeter", { altitude: 4200, pressure: 1013, pressureUnit: "hPa" }],
  ["VerticalSpeed", { verticalSpeed: -750, max: 4000 }],
  ["TurnCoordinator", { turnRate: 3, slip: 0.5 }],
];

for (const [format, library] of [
  ["ESM", indicators],
  ["CommonJS", createRequire(import.meta.url)("flight-indicators")],
]) {
  test(`${format} flight instruments render with the application's React runtime`, () => {
    for (const [name, props] of cases) {
      const markup = renderToStaticMarkup(
        React.createElement(library[name], {
          ...props,
          size: 150,
          showBox: false,
          animationDuration: 0,
          title: `${name} compatibility check`,
        }),
      );
      assert.match(markup, /<svg\b/, name);
      assert.match(markup, /role="img"/, name);
      assert.ok(markup.includes(`${name} compatibility check`), name);
      assert.doesNotMatch(markup, /NaN|Infinity|undefined/, name);
    }
  });
}
