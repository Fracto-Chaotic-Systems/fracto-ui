import * as THREE from "three";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import SimulatorFlightControls from "./SimulatorFlightControls.js";

/** Replace controllers without changing the pose, including inverted/rolled views. */
export function create_navigation_controls(camera, element, mode, previous) {
  const position = camera.position.clone(),
    quaternion = camera.quaternion.clone();
  const distance =
    previous?.target?.distanceTo(position) ||
    previous?.inspection_distance ||
    1;
  previous?.dispose();
  const controls =
    mode === "fly"
      ? new SimulatorFlightControls(camera, element)
      : new TrackballControls(camera, element);
  camera.position.copy(position);
  camera.quaternion.copy(quaternion);
  camera.up.set(0, 1, 0).applyQuaternion(quaternion);
  controls.inspection_distance = distance;
  controls.throttle = previous?.throttle ?? 0.25;
  controls.sensitivity = previous?.sensitivity ?? 1;
  if (mode === "inspect") {
    controls.staticMoving = true;
    controls.multiTouchRoll = true;
    controls.target
      .copy(position)
      .addScaledVector(
        new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion),
        distance,
      );
    controls.minDistance = previous?.minDistance ?? 0.001;
    controls.maxDistance = previous?.maxDistance ?? 100;
  }
  return controls;
}
