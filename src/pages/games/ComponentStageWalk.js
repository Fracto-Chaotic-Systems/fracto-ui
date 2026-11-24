import * as THREE from "three";

// First-person exploration of the construction stage. Pure stepping is kept
// separate from DOM input so it can move into the future engine package.
const jump_height = 0.6;
export const WALK_SETTINGS = Object.freeze({
  eye_height: 1.7,
  walk_speed: 1.4,
  run_speed: 4.2,
  fly_speed: 4,
  fly_run_multiplier: 3,
  fly_clearance: 0.3,
  gravity: 9.81,
  jump_speed: Math.sqrt(2 * 9.81 * jump_height),
  look_sensitivity: 0.0022,
  max_pitch: Math.PI * 0.49,
  field_of_view: 70,
});

/** Advance one step. `ground(x, z)` returns a floor height or null (treated as 0). */
export function step_walk(state, input, dt, ground, s = WALK_SETTINGS) {
  const sin = Math.sin(state.yaw),
    cos = Math.cos(state.yaw);
  let move_x = input.forward * -sin + input.right * cos,
    move_z = input.forward * -cos + input.right * -sin;
  const length = Math.hypot(move_x, move_z);
  if (length > 1) {
    move_x /= length;
    move_z /= length;
  }
  const speed = state.flying
    ? s.fly_speed * (input.run ? s.fly_run_multiplier : 1)
    : input.run
      ? s.run_speed
      : s.walk_speed;
  let [x, y, z] = state.position;
  x += move_x * speed * dt;
  z += move_z * speed * dt;
  const floor = ground(x, z) ?? 0;
  if (state.flying) {
    y = Math.max(y + input.up * speed * dt, floor + s.fly_clearance);
    return { ...state, position: [x, y, z], velocity_y: 0 };
  }
  let feet = y - s.eye_height,
    velocity_y = state.velocity_y;
  if (feet <= floor + 1e-3 && input.jump) velocity_y = s.jump_speed;
  velocity_y -= s.gravity * dt;
  feet += velocity_y * dt;
  if (feet <= floor) {
    feet = floor;
    velocity_y = 0;
  }
  return { ...state, position: [x, feet + s.eye_height, z], velocity_y };
}

export function look_walk(state, delta_x, delta_y, s = WALK_SETTINGS) {
  return {
    ...state,
    yaw: state.yaw - delta_x * s.look_sensitivity,
    pitch: Math.max(
      -s.max_pitch,
      Math.min(s.max_pitch, state.pitch - delta_y * s.look_sensitivity),
    ),
  };
}

/** Start at the construction's edge on the side the orbit camera was viewing from, facing its centre. */
export function walk_spawn(center, radius, camera_position, s = WALK_SETTINGS) {
  let dx = camera_position[0] - center[0],
    dz = camera_position[2] - center[2];
  const distance = Math.hypot(dx, dz);
  if (distance < 1e-6) {
    dx = 0;
    dz = 1;
  } else {
    dx /= distance;
    dz /= distance;
  }
  const reach = Math.min(Math.max(distance, 0.5), Math.max(radius * 0.9, 2));
  const x = center[0] + dx * reach,
    z = center[2] + dz * reach;
  return {
    position: [x, s.eye_height, z],
    yaw: Math.atan2(dx, dz),
    pitch: 0,
    velocity_y: 0,
    flying: false,
  };
}

const KEYS = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  ShiftLeft: "run",
  ShiftRight: "run",
  Space: "jump",
  KeyE: "rise",
  KeyQ: "sink",
};

export function create_walk_controller({ camera, canvas, ground, on_change }) {
  let active = false,
    locked = false,
    state = null;
  const held = new Set();
  const notify = () =>
    on_change?.({ active, locked, flying: Boolean(state?.flying) });
  const apply_camera = () => {
    camera.position.set(...state.position);
    camera.rotation.set(state.pitch, state.yaw, 0, "YXZ");
  };
  const has_keys = () => locked || document.activeElement === canvas;
  const key_down = (event) => {
    if (!active || !has_keys()) return;
    if (event.code === "KeyF" && !event.repeat) {
      state = { ...state, flying: !state.flying, velocity_y: 0 };
      notify();
      event.preventDefault();
      return;
    }
    const action = KEYS[event.code];
    if (!action) return;
    held.add(action);
    event.preventDefault();
  };
  const key_up = (event) => {
    const action = KEYS[event.code];
    if (action) held.delete(action);
  };
  const mouse_move = (event) => {
    if (!active || !locked) return;
    state = look_walk(state, event.movementX || 0, event.movementY || 0);
    apply_camera();
  };
  const lock_changed = () => {
    locked = document.pointerLockElement === canvas;
    if (!locked) held.clear();
    notify();
  };
  const click = () => {
    if (active && !locked) canvas.requestPointerLock?.();
  };
  const blur = () => held.clear();
  document.addEventListener("keydown", key_down);
  document.addEventListener("keyup", key_up);
  document.addEventListener("mousemove", mouse_move);
  document.addEventListener("pointerlockchange", lock_changed);
  window.addEventListener("blur", blur);
  canvas.addEventListener("click", click);
  return {
    get active() {
      return active;
    },
    enter(spawn) {
      state = spawn;
      active = true;
      held.clear();
      apply_camera();
      canvas.focus?.();
      notify();
    },
    exit() {
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      active = false;
      locked = false;
      held.clear();
      notify();
    },
    update(dt) {
      if (!active) return;
      const input = {
        forward: (held.has("forward") ? 1 : 0) - (held.has("back") ? 1 : 0),
        right: (held.has("right") ? 1 : 0) - (held.has("left") ? 1 : 0),
        up: (held.has("rise") ? 1 : 0) - (held.has("sink") ? 1 : 0),
        run: held.has("run"),
        jump: held.has("jump"),
      };
      state = step_walk(state, input, dt, ground);
      apply_camera();
    },
    dispose() {
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      document.removeEventListener("keydown", key_down);
      document.removeEventListener("keyup", key_up);
      document.removeEventListener("mousemove", mouse_move);
      document.removeEventListener("pointerlockchange", lock_changed);
      window.removeEventListener("blur", blur);
      canvas.removeEventListener("click", click);
    },
  };
}

/**
 * Floor height under (x, z) from the authored floor mesh only; foliage and props
 * never lift the walker. `root` may be a group or a getter for the current group,
 * because the stage replaces its content group on every rebuild.
 */
export function create_floor_probe(root) {
  const current = typeof root === "function" ? root : () => root;
  const ray = new THREE.Raycaster(),
    origin = new THREE.Vector3(),
    down = new THREE.Vector3(0, -1, 0);
  return (x, z) => {
    const floors = current().children.filter(
      (child) => child.userData.component_item_id === "floor",
    );
    if (!floors.length) return null;
    origin.set(x, 10000, z);
    ray.set(origin, down);
    const hit = ray.intersectObjects(floors, false)[0];
    return hit ? hit.point.y : null;
  };
}
