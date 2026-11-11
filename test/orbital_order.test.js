import test from "node:test";
import assert from "node:assert/strict";
import {
  orbital_start_index,
  compare_orbitals,
  format_landing_ratios,
  ordered_orbital_points,
} from "../src/pages/study/points/PointsOrbitalOrder.js";

test("landing groups sort by exact fraction value without modifying their source", () => {
  const ratios = [
    { numerator: "7", denominator: "15" },
    { numerator: "1", denominator: "3" },
    { numerator: "2", denominator: "15" },
  ];
  const before = JSON.stringify(ratios);
  assert.equal(format_landing_ratios(ratios), "2/15, 1/3, 7/15");
  assert.equal(JSON.stringify(ratios), before);
  assert.equal(
    format_landing_ratios([
      { numerator: "9007199254740993", denominator: "18014398509481985" },
      { numerator: "9007199254740992", denominator: "18014398509481985" },
    ]),
    "9007199254740992/18014398509481985, 9007199254740993/18014398509481985",
  );
  assert.equal(format_landing_ratios(), "—");
});

test("orbital display rotates entire landing groups without sorting the cycle or changing point identities", () => {
  const orbital = {
    points: [
      { point_index: 0, landing_ratios: [{ numerator: "8" }] },
      {
        point_index: 1,
        landing_ratios: [{ numerator: "7" }, { numerator: "1" }],
      },
      { point_index: 2, landing_ratios: [{ numerator: "4" }] },
      { point_index: 3, landing_ratios: [{ numerator: "2" }] },
    ],
  };
  const before = JSON.stringify(orbital);
  assert.equal(orbital_start_index(orbital), 1);
  const points = ordered_orbital_points(orbital);
  assert.deepEqual(
    points.map((point) => point.point_index),
    [1, 2, 3, 0],
  );
  assert.equal(points[0], orbital.points[1]);
  assert.equal(JSON.stringify(orbital), before);
  assert.deepEqual(
    ordered_orbital_points({ points }).map((point) => point.point_index),
    [1, 2, 3, 0],
  );
});

test("orbitals sort by period then exact lowest numerator, keeping ties stable and unknown ratios last", () => {
  const make = (id, period, numerators) => ({
    orbital_id: id,
    period,
    points: [
      { landing_ratios: numerators.map((numerator) => ({ numerator })) },
    ],
  });
  const orbitals = [
    make("large", 3, ["9007199254740993"]),
    make("short", 2, ["9"]),
    make("unknown", 3, []),
    make("small", 3, ["9007199254740992"]),
    make("group", 3, ["8", "1"]),
    make("tie", 3, ["1"]),
  ];
  assert.deepEqual(
    orbitals.sort(compare_orbitals).map((orbital) => orbital.orbital_id),
    ["short", "group", "tie", "small", "large", "unknown"],
  );
});

test("numerator comparison retains integer precision and leaves ratio-free cycles unchanged", () => {
  const points = [
    { landing_ratios: [{ numerator: "9007199254740993" }] },
    { landing_ratios: [{ numerator: "9007199254740992" }] },
  ];
  assert.equal(orbital_start_index({ points }), 1);
  const no_ratios = [
    { point_index: 0 },
    { point_index: 1, landing_ratios: [] },
  ];
  assert.equal(ordered_orbital_points({ points: no_ratios }), no_ratios);
  assert.deepEqual(ordered_orbital_points(null), []);
});
