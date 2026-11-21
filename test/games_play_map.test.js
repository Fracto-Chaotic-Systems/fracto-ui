import assert from "node:assert/strict";
import test from "node:test";
import {
  flight_map_marker,
  create_parchment_map_painter,
  parchment_grid_lines,
  PARCHMENT_MAP_VIEW,
  reveal_escape_grid,
} from "../src/pages/games/GamesPlayMap.js";
import {
  create_flight_state,
  INITIAL_FLIGHT_STATE,
} from "../src/pages/games/flight/FlightState.js";

test("grid lines align with complex coordinates and emphasize integers", () => {
  const lines = parchment_grid_lines();
  assert.deepEqual(
    lines.filter(({ axis, half }) => axis === "re" && half).map(({ value }) => value),
    [-2, -1.5, -1, -0.5, 0, 0.5],
  );
  assert.deepEqual(
    lines.filter(({ axis, half }) => axis === "im" && half).map(({ value }) => value),
    [-1, -0.5, 0, 0.5, 1],
  );
  assert.equal(lines.filter(({ axis }) => axis === "re").length, 28);
  assert.equal(lines.filter(({ axis }) => axis === "im").length, 25);
  for (const line of lines) {
    assert.equal(line.major, Number.isInteger(line.value));
    assert.equal(line.half, Number.isInteger(line.value * 2));
    const marker = flight_map_marker({
      source: "live",
      position_re: line.axis === "re" ? line.value : PARCHMENT_MAP_VIEW.focal_point.x,
      position_im: line.axis === "im" ? line.value : PARCHMENT_MAP_VIEW.focal_point.y,
      heading_deg: 0,
    });
    const bounded_position = Math.min(96, Math.max(4, line.position_pct));
    assert.ok(Math.abs(bounded_position - marker[line.axis === "re" ? "x_pct" : "y_pct"]) < 1e-10);
  }
  assert.equal(lines.find(({ axis, value }) => axis === "im" && value === 0).position_pct, 50);
  assert.ok(lines.find(({ axis, value }) => axis === "re" && value === 0).position_pct > 75);
});

test("map coordinates follow the raster with north up and east right", () => {
  const { focal_point, scope, aspect_ratio } = PARCHMENT_MAP_VIEW;
  const pose = {
    source: "live",
    position_re: focal_point.x,
    position_im: focal_point.y,
    heading_deg: 0,
  };
  assert.deepEqual(flight_map_marker(pose), {
    x_pct: 50, y_pct: 50, heading_deg: 0, off_map: false,
  });
  const northeast = flight_map_marker({
    ...pose,
    position_re: focal_point.x + scope / 4,
    position_im: focal_point.y + scope * aspect_ratio / 4,
    heading_deg: 90,
    camera_heading_deg: 180,
  });
  assert.equal(northeast.x_pct, 75);
  assert.equal(northeast.y_pct, 25);
  assert.equal(northeast.heading_deg, 90);
  for (const heading of [0, 90, 180, 270]) {
    assert.equal(flight_map_marker({ ...pose, heading_deg: heading }).heading_deg, heading);
  }
});

test("flight updates move and turn the marker; off-chart and unavailable positions are handled", () => {
  const flight = create_flight_state(INITIAL_FLIGHT_STATE);
  const start = flight_map_marker(flight.get_snapshot());
  assert.equal(start.off_map, true);
  assert.equal(start.y_pct, 96);
  let marker;
  const unsubscribe = flight.subscribe(() => {
    marker = flight_map_marker(flight.get_snapshot());
  });
  flight.update({ position_re: -0.75, position_im: 0, heading_deg: -90 });
  assert.deepEqual(marker, {
    x_pct: 50, y_pct: 50, heading_deg: 270, off_map: false,
  });
  flight.update({ position_re: 100, position_im: 100 });
  assert.equal(marker.x_pct, 96);
  assert.equal(marker.y_pct, 4);
  assert.equal(marker.off_map, true);
  flight.update({ source: "unavailable" });
  assert.equal(marker, null);
  unsubscribe();
  assert.equal(flight_map_marker(null), null);
  assert.equal(flight_map_marker({ position_re: NaN }), null);
});

test("the grid replaces lighter escape and missing pixels while preserving both set pattern signs", () => {
  const image = { data: new Uint8ClampedArray(2 * 3 * 4).fill(127) };
  let painted;
  const ctx = {
    canvas: { width: 2, height: 3 },
    getImageData: () => image,
    putImageData: (result, x, y) => {
      painted = [result, x, y];
    },
  };
  reveal_escape_grid(
    [
      [[0, 12], [-3, 24], null],
      [[7, 42], [0, 5]],
    ],
    ctx,
  );
  assert.deepEqual(
    Array.from(image.data).filter((_, i) => i % 4 === 3),
    [0, 127, 127, 0, 0, 0],
  );
  assert.ok(
    Array.from(image.data).every((value, i) => i % 4 === 3 || value === 127),
  );
  assert.deepEqual(painted, [image, 0, 0]);
});

test("dark escape shading outlines branches while lighter escape shading exposes the grid", () => {
  const shades = [50, 96, 97, 220, 30, 240, 20];
  const pixels = new Uint8ClampedArray(shades.flatMap((shade) => [shade, shade, shade, 255]));
  const image = { data: pixels };
  const original = pixels.slice();
  const ctx = {
    canvas: { width: shades.length, height: 1 },
    getImageData: () => image,
    putImageData: () => {},
  };
  reveal_escape_grid(
    [[[0, 150]], [[0, 80]], [[0, 70]], [[0, 3]], [[-3, 90]], [[7, 90]], [null]],
    ctx,
  );
  assert.deepEqual(
    Array.from(pixels).filter((_, index) => index % 4 === 3),
    [255, 0, 0, 0, 255, 255, 0],
  );
  assert.ok(pixels.every((value, index) => index % 4 === 3 || value === original[index]));
});

test("thin escape bands widen only at and right of -0.5", () => {
  const width = 56;
  const shades = [80, 81, 96, 112, 113];
  const pixels = new Uint8ClampedArray(width * shades.length * 4);
  for (let y = 0; y < shades.length; y++) {
    for (let x = 0; x < width; x++) {
      pixels.set([shades[y], shades[y], shades[y], 255], (y * width + x) * 4);
    }
  }
  const buffer = Array.from({ length: width }, () => shades.map(() => [0, 100]));
  const ctx = {
    canvas: { width, height: shades.length },
    getImageData: () => ({ data: pixels }),
    putImageData: () => {},
  };
  reveal_escape_grid(buffer, ctx);
  const alphas = (x) => shades.map((_, y) => pixels[(y * width + x) * 4 + 3]);
  assert.deepEqual(alphas(32), [255, 0, 0, 0, 0]);
  assert.deepEqual(alphas(33), [255, 128, 128, 128, 126]);
  assert.deepEqual(alphas(34), [255, 128, 128, 128, 126]);
});

test("adaptive right-side outlines preserve filaments without broad upper and lower escape bands", () => {
  const width = 56;
  const height = 40;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const buffer = Array.from({ length: width }, () =>
    Array.from({ length: height }, () => [0, 100]),
  );
  const paint = (x, y, shade, pattern = 0) => {
    pixels.set([shade, shade, shade, 255], (y * width + x) * 4);
    buffer[x][y] = [pattern, 100];
  };
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) paint(x, y, 220);
  }
  // Broad dark escape patches around the upper/lower colored bulbs.
  for (const top of [2, 24]) {
    for (let x = 34; x <= 50; x++) {
      for (let y = top; y <= top + 14; y++) {
        const in_set = x >= 38 && x <= 46 && y >= top + 4 && y <= top + 10;
        paint(x, y, in_set ? 230 : 100, in_set ? 3 : 0);
      }
    }
  }
  // Equally shaded narrow filaments on the left and right.
  for (let x = 18; x <= 52; x++) paint(x, 20, 100);
  paint(35, 9, 70);
  const ctx = {
    canvas: { width, height },
    getImageData: () => ({ data: pixels }),
    putImageData: () => {},
  };
  reveal_escape_grid(buffer, ctx);
  const alpha = (x, y) => pixels[(y * width + x) * 4 + 3];
  assert.equal(alpha(42, 4), 0);
  assert.equal(alpha(42, 14), 0);
  assert.equal(alpha(42, 26), 0);
  assert.equal(alpha(42, 36), 0);
  assert.equal(alpha(42, 9), 255); // Colored set remains intact.
  assert.equal(alpha(35, 9), 255); // Base darkest shading remains intact.
  assert.equal(alpha(43, 20), 255); // Thin right-side branch gains shading.
  assert.equal(alpha(25, 20), 0); // Left-side treatment is unchanged.
});

test("fine branches fade through width and shade changes without spreading into broad regions", () => {
  const width = 112;
  const height = 64;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const buffer = Array.from({ length: width }, () =>
    Array.from({ length: height }, () => [0, 100]),
  );
  const paint = (x, y, shade) => {
    pixels.set([shade, shade, shade, 255], (y * width + x) * 4);
  };
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) paint(x, y, 220);
  }
  // Cross-sections at the former hard cutoff now fade gradually to zero.
  for (const [top, thickness] of [[4, 4], [16, 5], [29, 6]]) {
    for (let x = 70; x <= 104; x++) {
      for (let y = top; y < top + thickness; y++) paint(x, y, 100);
    }
  }
  // A bent filament with varying thickness and a slightly lighter interruption.
  const centers = [];
  for (let x = 70; x <= 104; x++) {
    const y = 44 + Math.floor((x - 70) / 4);
    const thickness = 3 + x % 3;
    centers.push([x, y]);
    for (let dy = -1; dy < thickness - 1; dy++) paint(x, y + dy, x === 87 ? 120 : 100);
  }
  const original = pixels.slice();
  reveal_escape_grid(buffer, {
    canvas: { width, height },
    getImageData: () => ({ data: pixels }),
    putImageData: () => {},
  });
  const alpha = (x, y) => pixels[(y * width + x) * 4 + 3];
  assert.equal(alpha(87, 5), 255);
  assert.ok(alpha(87, 18) > 0 && alpha(87, 18) < 255);
  assert.equal(alpha(87, 32), 0);
  for (const [x, y] of centers) assert.ok(alpha(x, y) > 0, `branch gap at ${x},${y}`);
  assert.ok(alpha(87, centers.find(([x]) => x === 87)[1]) < 255);
  assert.equal(alpha(87, 40), 0);
  assert.ok(pixels.every((value, index) => index % 4 === 3 || value === original[index]));
});

test("display size preserves fine-branch coverage without growing broad bands and resizing is reversible", () => {
  const width = 400;
  const height = 100;
  const original = new Uint8ClampedArray(width * height * 4);
  const buffer = Array.from({ length: width }, () =>
    Array.from({ length: height }, () => [0, 100]),
  );
  const paint = (x, y, shade, pattern = 0) => {
    original.set([shade, shade, shade, 255], (y * width + x) * 4);
    buffer[x][y] = [pattern, 100];
  };
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) paint(x, y, 220);
  }
  for (let x = 270; x <= 350; x++) {
    for (let y = 10; y <= 30; y++) paint(x, y, 100);
    for (let y = 60; y <= 63; y++) paint(x, y, 100);
  }
  paint(300, 20, 240, 3);
  paint(280, 20, 70);
  let pixels = original.slice();
  const ctx = {
    canvas: { width, height },
    getImageData: () => ({ data: pixels.slice() }),
    putImageData: (image) => { pixels = image.data.slice(); },
  };
  const painter = create_parchment_map_painter();
  // A resize before the asynchronous raster arrives is retained.
  painter.resize(100);
  painter.on_plan_complete(buffer, ctx);
  const small = pixels.slice();
  const alpha = (x, y) => pixels[(y * width + x) * 4 + 3];
  assert.ok(alpha(310, 59) > 0); // Subpixel edge coverage keeps small branches visible.
  for (const size of [200, 400, 100, 400, 100]) {
    painter.resize(size);
    assert.equal(alpha(310, 12), 0); // Broad upper band stays clear.
    assert.equal(alpha(310, 28), 0); // Broad lower band stays clear.
    assert.equal(alpha(300, 20), 255); // Colored set is untouched.
    assert.equal(alpha(280, 20), 255); // Accepted base shading is untouched.
    assert.ok(alpha(310, 61) > 0); // Fine branches survive every display size.
    if (size >= 200) assert.equal(alpha(310, 59), 0);
    if (size === 100) assert.deepEqual(pixels, small);
  }
  painter.resize(200);
  const regular = pixels.slice();
  painter.resize(400);
  assert.ok(alpha(310, 61) < regular[(61 * width + 310) * 4 + 3]);
  painter.resize(200);
  assert.deepEqual(pixels, regular);
});

test("the -2 to -1.4 real-axis antenna gains a feathered outline without broadening nearby bulbs", () => {
  const width = 400;
  const height = 360;
  const original = new Uint8ClampedArray(width * height * 4);
  const buffer = Array.from({ length: width }, () =>
    Array.from({ length: height }, () => [0, 100]),
  );
  const paint = (x, y, shade, pattern = 0) => {
    original.set([shade, shade, shade, 255], (y * width + x) * 4);
    buffer[x][y] = [pattern, 100];
  };
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) paint(x, y, 220);
  }
  for (let x = 10; x <= 140; x++) {
    for (let y = 179; y <= 181; y++) paint(x, y, 100);
    paint(x, 150, 100);
  }
  for (let x = 80; x <= 100; x++) {
    for (let y = 168; y <= 192; y++) paint(x, y, 100);
  }
  paint(90, 180, 240, 3);
  for (const display_width of [100, 200, 400]) {
    const pixels = original.slice();
    reveal_escape_grid(buffer, {
      canvas: { width, height },
      getImageData: () => ({ data: pixels }),
      putImageData: () => {},
    }, display_width);
    const alpha = (x, y) => pixels[(y * width + x) * 4 + 3];
    assert.equal(alpha(50, 180), 255); // Re=-1.8, Im=0: antenna core.
    assert.ok(alpha(112, 180) > 0 && alpha(112, 180) < 255); // Taper near -1.4.
    assert.equal(alpha(10, 180), 0); // Re=-2.08: outside the left feather.
    assert.equal(alpha(135, 180), 0); // Re=-1.205: other left regions unchanged.
    assert.equal(alpha(50, 150), 0); // Away from the real axis.
    assert.equal(alpha(90, 171), 0); // Broad escape band stays clear.
    assert.equal(alpha(90, 180), 255); // Colored set stays intact.
  }
});
