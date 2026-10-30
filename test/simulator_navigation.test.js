import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { create_navigation_controls } from "../src/pages/assets/SimulatorNavigation.js";
import SimulatorFlightControls from "../src/pages/assets/SimulatorFlightControls.js";
import {
  inside_flight_region,
  prepare_flight_pose,
  confine_flight,
  flight_boundary_status,
  flight_region_key,
} from "../src/pages/assets/SimulatorFlightRegion.js";
import {
  flight_readings,
  FLIGHT_MAX_SPEED_SCOPES_PER_SECOND,
} from "../src/pages/assets/SimulatorFlightMetrics.js";

class Surface {
  listeners = new Map();
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
  }
  removeEventListener(type, callback) {
    this.listeners.get(type)?.delete(callback);
  }
  emit(type, event) {
    for (const callback of [...(this.listeners.get(type) || [])])
      callback(event);
  }
  count(type) {
    return this.listeners.get(type)?.size || 0;
  }
}

test("real inspect/fly controllers preserve rolled poses, detach prior input and start flight stationary", () => {
  const previousWindow = globalThis.window;
  const windowSurface = new Surface();
  Object.assign(windowSurface, { pageXOffset: 0, pageYOffset: 0 });
  globalThis.window = windowSurface;
  const documentSurface = Object.assign(new Surface(), {
    documentElement: { clientLeft: 0, clientTop: 0 },
  });
  const canvas = Object.assign(new Surface(), {
    style: {},
    ownerDocument: documentSurface,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  });
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0.2, -0.4, 0.7);
  camera.quaternion.setFromEuler(new THREE.Euler(1.9, 0.5, 2.4));
  const position = camera.position.clone(),
    rotation = camera.quaternion.clone();
  let controls;
  try {
    controls = create_navigation_controls(camera, canvas, "inspect");
    controls.update();
    assert.ok(camera.position.distanceTo(position) < 1e-12);
    assert.ok(1 - Math.abs(camera.quaternion.dot(rotation)) < 1e-12);
    for (let i = 0; i < 3; i++) {
      controls = create_navigation_controls(camera, canvas, "fly", controls);
      assert.equal(windowSurface.count("keydown"), 1);
      assert.equal(
        canvas.count("wheel"),
        0,
        "inspect wheel listener is removed",
      );
      controls.update(1);
      assert.ok(
        camera.position.distanceTo(position) < 1e-12,
        "disabled flight is stationary",
      );
      controls.enabled = true;
      controls.update(1);
      assert.ok(
        camera.position.distanceTo(position) < 1e-12,
        "enabling flight does not auto-advance",
      );
      controls = create_navigation_controls(
        camera,
        canvas,
        "inspect",
        controls,
      );
      controls.update();
      assert.equal(windowSurface.count("keydown"), 1);
      assert.equal(canvas.count("wheel"), 1);
      assert.ok(camera.position.distanceTo(position) < 1e-12);
      assert.ok(1 - Math.abs(camera.quaternion.dot(rotation)) < 1e-12);
    }
    controls = create_navigation_controls(camera, canvas, "fly", controls);
    controls.enabled = true;
    controls.set_paused(false);
    windowSurface.emit("keydown", { code: "KeyW" });
    controls.update(0.1);
    assert.ok(
      camera.position.distanceTo(position) > 0,
      "basic free flight moves in camera-local direction",
    );
    const moved = camera.position.clone(),
      direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    assert.ok(moved.clone().sub(position).normalize().dot(direction) > 0.999);
    controls = create_navigation_controls(camera, canvas, "fly", controls);
    controls.enabled = true;
    controls.update(1);
    assert.ok(
      camera.position.distanceTo(moved) < 1e-12,
      "replacing controls clears held inputs",
    );
  } finally {
    controls?.dispose();
    globalThis.window = previousWindow;
  }
  assert.equal(windowSurface.count("keydown"), 0);
  assert.equal(windowSurface.count("keyup"), 0);
});

function aircraft() {
  const camera = new THREE.PerspectiveCamera();
  const controls = new SimulatorFlightControls(camera, null);
  controls.enabled = true;
  controls.set_paused(false);
  return { camera, controls };
}

test("region starts and boundaries respect aspect ratio, signed altitude and first edge crossing", () => {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(2, 3, 4);
  prepare_flight_pose(camera, 0.1);
  assert.equal(inside_flight_region(camera.position, 0.1), true);
  assert.ok(camera.position.y > 1 / 25);
  camera.position.set(0.1, -99, 0.01);
  camera.quaternion.setFromEuler(new THREE.Euler(1, 2, 3));
  const position = camera.position.clone(),
    rotation = camera.quaternion.clone();
  prepare_flight_pose(camera, 0.1);
  assert.ok(camera.position.equals(position));
  assert.ok(camera.quaternion.equals(rotation));
  const previous = new THREE.Vector3(0, -2, 0),
    end = new THREE.Vector3(1, 0, 0.25);
  assert.equal(confine_flight(previous, end, 1), true);
  assert.ok(end.x < 0.5 && end.x > 0.499);
  assert.ok(
    Math.abs(end.y + 1) < 1e-6 && Math.abs(end.z - 0.125) < 1e-6,
    "clip the flight segment at its first crossed edge",
  );
  const narrow = new THREE.Vector3(0.1, 100, 0.2);
  confine_flight(new THREE.Vector3(0, 99, 0), narrow, 0.1);
  assert.ok(narrow.z < 0.05 && narrow.z > 0.049);
  assert.ok(narrow.y > 99, "altitude remains unrestricted");
  camera.position.set(0, -99, -0.2);
  camera.quaternion.identity();
  assert.equal(flight_boundary_status(camera, 0, 1), null);
  assert.equal(flight_boundary_status(camera, 0.2, 1), "near");
  camera.rotateY(Math.PI);
  assert.equal(flight_boundary_status(camera, 0.2, 1), null);
  camera.position.x = 0.5 - 1e-7;
  assert.equal(flight_boundary_status(camera, 0, 1), "edge");
  const region = { focal_point: { x: 0, y: 0 }, scope: 1, aspect_ratio: 1 };
  assert.equal(
    flight_region_key({ ...region, minimum_resolution: 5000 }),
    flight_region_key(region),
  );
  assert.notEqual(
    flight_region_key({ ...region, scope: 2 }),
    flight_region_key(region),
  );
});
const advance = (controls, seconds, hz = 60) => {
  for (let i = 0; i < seconds * hz; i++) controls.update(1 / hz);
};

test("speed and altitude use navigator scope rather than mesh resolution or geographic units", () => {
  const camera = new THREE.PerspectiveCamera();
  camera.position.y = 0.02;
  const small = flight_readings(
    camera,
    FLIGHT_MAX_SPEED_SCOPES_PER_SECOND,
    0.001,
    0.03,
  );
  const large = flight_readings(
    camera,
    FLIGHT_MAX_SPEED_SCOPES_PER_SECOND,
    10,
    0.03,
  );
  assert.equal(small.speed_scopes, 0.2);
  assert.equal(large.speed_scopes, small.speed_scopes);
  assert.equal(large.speed_units, 2);
  assert.ok(Math.abs(large.speed_units / small.speed_units - 10000) < 1e-10);
  assert.equal(large.altitude, 0.2);
  assert.ok(
    Math.abs(large.clearance + 0.1) < 1e-12,
    "negative clearance denotes underside, independent of camera roll",
  );
  assert.equal(flight_readings(camera, 0, 10, null).clearance, null);
  assert.equal(flight_readings(camera, 0, 0, null), null);
});

test("powered flight accelerates continuously, throttle decelerates gently and pause freezes", () => {
  const { camera, controls } = aircraft();
  advance(controls, 1);
  const firstSpeed = controls.speed,
    firstZ = camera.position.z;
  assert.ok(firstSpeed > 0 && firstSpeed < 0.05);
  advance(controls, 1);
  assert.ok(
    controls.speed > firstSpeed && camera.position.z < firstZ,
    "forward motion needs no held key",
  );
  controls.set_throttle(0);
  controls.update(1 / 60);
  assert.ok(
    controls.speed > 0 && controls.speed > firstSpeed,
    "zero throttle does not abruptly stop",
  );
  advance(controls, 12);
  assert.ok(controls.speed < 1e-6);
  controls.set_throttle(1);
  advance(controls, 1);
  controls.set_paused(true);
  const pose = camera.position.toArray(),
    rotation = camera.quaternion.toArray();
  controls.key_down({ code: "ArrowUp" });
  advance(controls, 2);
  assert.deepEqual(camera.position.toArray(), pose);
  assert.deepEqual(camera.quaternion.toArray(), rotation);
  assert.equal(controls.speed, 0);
  controls.key_down({ code: "Space", repeat: false });
  assert.equal(controls.paused, false);
  controls.key_down({ code: "Space", repeat: true });
  assert.equal(controls.paused, false, "held Space never toggles repeatedly");
  controls.update(1 / 60);
  assert.ok(
    controls.speed > 0 && controls.speed < 0.01,
    "resume accelerates from rest",
  );
});

test("flight integration is frame-rate independent and ignores invalid/large time jumps", () => {
  const a = aircraft(),
    b = aircraft();
  advance(a.controls, 5, 30);
  advance(b.controls, 5, 120);
  assert.ok(a.camera.position.distanceTo(b.camera.position) < 1e-10);
  assert.ok(Math.abs(a.controls.speed - b.controls.speed) < 1e-12);
  const before = a.camera.position.clone();
  a.controls.update(NaN);
  a.controls.update(-1);
  assert.equal(a.camera.position.distanceTo(before), 0);
  a.controls.update(60);
  assert.ok(
    a.camera.position.distanceTo(before) <= 0.01,
    "time jumps are capped at 50ms",
  );
});

test("aircraft inputs adjust throttle, pitch, bank and yaw with unrestricted orientation", () => {
  const { camera, controls } = aircraft();
  controls.key_down({ code: "KeyW" });
  advance(controls, 1);
  controls.key_up({ code: "KeyW" });
  assert.ok(Math.abs(controls.throttle - 0.5) < 1e-12);
  controls.set_throttle(99);
  assert.equal(controls.throttle, 1);
  controls.set_throttle(-1);
  assert.equal(controls.throttle, 0);
  controls.set_throttle(0.25);
  controls.key_down({ code: "ArrowUp" });
  advance(controls, 6);
  controls.key_up({ code: "ArrowUp" });
  assert.ok(camera.up.y < 0, "can pitch past upright limits and fly inverted");
  controls.set_paused(true);
  controls.set_paused(false);
  assert.equal(controls.keys.size, 0);
  camera.quaternion.identity();
  camera.position.set(0, 0, 0);
  controls.key_down({ code: "ArrowLeft" });
  advance(controls, 1);
  controls.key_up({ code: "ArrowLeft" });
  assert.ok(camera.up.x < 0, "left arrow banks left");
  assert.ok(
    Math.abs(camera.quaternion.y) > 0,
    "banking introduces gentle turning",
  );
  controls.set_sensitivity(99);
  assert.equal(controls.sensitivity, 2);
  controls.set_sensitivity(-1);
  assert.equal(controls.sensitivity, 0.25);
  const throttle = controls.throttle;
  controls.enabled = false;
  controls.key_down({ code: "KeyW" });
  advance(controls, 1);
  assert.equal(controls.throttle, throttle, "unfocused controls ignore keys");
});
