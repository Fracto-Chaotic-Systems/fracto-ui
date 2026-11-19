import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as indicators from "flight-indicators";
import { flight_instrument_props } from "../src/pages/games/flight/FlightInstrumentModel.js";

const cases = [
  ["Airspeed", { speed: 180, max: 300, arcs: {}, unit: "KNOTS" }],
  ["AttitudeIndicator", { roll: 25, pitch: -15, pitchLimit: 60 }],
  ["HeadingIndicator", { heading: 359 }],
  ["Altimeter", { altitude: 4200, pressure: 1013, pressureUnit: "hPa" }],
  ["VerticalSpeed", { verticalSpeed: -750, max: 4000 }],
  ["TurnCoordinator", { turnRate: 3, slip: 0.5 }],
];

test("expanded airspeed dials render exactly the original colored band angles", () => {
  const original = {
    white: [33, 85],
    green: [44, 129],
    yellow: [129, 163],
    red: 163,
  };
  const paths = (props) => {
    const markup = renderToStaticMarkup(
      React.createElement(indicators.Airspeed, props),
    );
    return ["#fff", "#2fb54a", "#f2c200", "#e02020"].map((color) => {
      const path = [...markup.matchAll(/<path\b[^>]*>/g)]
        .map((match) => match[0])
        .find((path) => path.includes(`stroke="${color}"`));
      return path.match(/\bd="([^"]+)"/)[1];
    });
  };
  const reference = paths({ max: 200, arcs: original });
  for (const speed_max_knots of [500, 800, 1000])
    for (const speed_unit of ["knots", "kmh", "mps"]) {
      const props = flight_instrument_props(
        "airspeed",
        { airspeed_knots: 300 },
        { speed_max_knots, speed_unit },
      );
      assert.deepEqual(paths(props), reference);
    }
});

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
