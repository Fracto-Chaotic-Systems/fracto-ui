import { create_path_motion_controller } from "@fracto/sdk/FractoPathMotion.js";
import { component_motion_bounds } from "@fracto/sdk/FractoComponentMotion.js";
import { play_grass_view } from "./GamesPlayGrassView.js";

const MIN_START = 0.1;
const MAX_START = 0.9;
const MIN_SEPARATION = 0.1;
const STORAGE_KEY = "fracto.play.grass-traversal-start";
let last_start = null;
const valid_start = (value) =>
  Number.isFinite(value) && value >= MIN_START && value <= MAX_START;

// Choose a different stretch, always on the forward leg, away from either turn.
export function select_play_traversal_start(
  previous,
  random = Math.random,
  candidates,
) {
  if (candidates?.length) {
    const separated = candidates.filter(
      (value) =>
        !valid_start(previous) || Math.abs(value - previous) >= MIN_SEPARATION,
    );
    const choices = separated.length ? separated : candidates;
    return choices[
      Math.min(choices.length - 1, Math.floor(random() * choices.length))
    ];
  }
  if (!valid_start(previous))
    return MIN_START + random() * (MAX_START - MIN_START);
  const left_end = Math.max(MIN_START, previous - MIN_SEPARATION);
  const right_start = Math.min(MAX_START, previous + MIN_SEPARATION);
  const left_length = left_end - MIN_START;
  const right_length = MAX_START - right_start;
  const offset = random() * (left_length + right_length);
  const selected =
    right_length === 0 || offset < left_length
      ? MIN_START + offset
      : right_start + offset - left_length;
  return Math.max(MIN_START, Math.min(MAX_START, selected));
}

export function random_play_traversal_start({
  random = Math.random,
  storage,
  candidates,
} = {}) {
  let store;
  let previous = last_start;
  try {
    store = storage === undefined ? window.sessionStorage : storage;
    const saved = store?.getItem(STORAGE_KEY);
    if (saved !== null && saved !== undefined && valid_start(Number(saved)))
      previous = Number(saved);
  } catch {
    /* Storage is optional; resets still differ within this page. */
  }
  const selected = select_play_traversal_start(previous, random, candidates);
  last_start = selected;
  try {
    store?.setItem(STORAGE_KEY, String(selected));
  } catch {
    /* Optional storage. */
  }
  return selected;
}

// Test the actual camera crop against each insect's entire movement envelope.
// Keep a small silhouette margin and eight seconds of camera travel in reserve,
// so a bug is comfortably in frame rather than just crossing its edge at entry.
export function visible_play_traversal_starts(
  document,
  path,
  width,
  height,
  insect_group,
) {
  const view = play_grass_view(document.floor, width, height);
  const motion = create_path_motion_controller(path);
  const bounds = document.objects
    .filter((object) => object.group_id === insect_group)
    .map(component_motion_bounds);
  const candidates = [];
  for (let i = 0; i <= 800; i++) {
    const fraction = MIN_START + (i / 800) * (MAX_START - MIN_START);
    const pose = motion.sample(play_traversal_start_seconds(motion, fraction));
    const sin = Math.sin(pose.heading_radians),
      cos = Math.cos(pose.heading_radians);
    if (
      bounds.some(({ min, max }) =>
        [min[0], max[0]].every((x) =>
          [min[2], max[2]].every((z) => {
            const dx = x - pose.position[0],
              dz = z - pose.position[2];
            return (
              Math.abs(cos * dx - sin * dz) + 0.02 < view.width / 2 &&
              Math.abs(sin * dx + cos * dz) + 0.02 + path.speed_mps * 8 <
                view.height / 2
            );
          }),
        ),
      )
    )
      candidates.push(fraction);
  }
  return candidates;
}

// Invert the existing controller's forward travel; keep its ramps, turns and route.
export function play_traversal_start_seconds(motion, fraction) {
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1)
    throw new Error("invalid_traversal_start");
  const target = motion.sample(motion.travel_seconds).distance_m * fraction;
  let low = 0,
    high = motion.travel_seconds;
  for (let i = 0; i < 48; i++) {
    const middle = (low + high) / 2;
    if (motion.sample(middle).distance_m < target) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}
