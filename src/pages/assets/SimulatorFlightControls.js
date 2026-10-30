import { Controls, Euler, Quaternion, Vector3 } from "three";
import { FLIGHT_MAX_SPEED_SCOPES_PER_SECOND as MAX_SPEED } from "./SimulatorFlightMetrics.js";

const FLIGHT_KEYS = new Set([
  "KeyW",
  "KeyS",
  "KeyA",
  "KeyD",
  "KeyQ",
  "KeyE",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
]);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

/** Lightweight aircraft-style motion in navigator-relative units, using Three.js transforms. */
export default class SimulatorFlightControls extends Controls {
  throttle = 0.25;
  sensitivity = 1;
  paused = true;
  speed = 0;
  keys = new Set();
  angular_velocity = new Vector3();
  mouse = { x: 0, y: 0 };
  dragging = false;
  constructor(camera, element) {
    super(camera, null);
    this.enabled = false;
    if (element) this.connect(element);
  }
  connect(element) {
    super.connect(element);
    window.addEventListener("keydown", this.key_down);
    window.addEventListener("keyup", this.key_up);
    element.addEventListener("pointerdown", this.pointer_down);
    element.addEventListener("pointermove", this.pointer_move);
    element.addEventListener("pointerup", this.pointer_up);
    element.addEventListener("pointercancel", this.pointer_up);
    element.style.touchAction = "none";
  }
  dispose() {
    if (!this.domElement) {
      this.clear_input();
      return;
    }
    window.removeEventListener("keydown", this.key_down);
    window.removeEventListener("keyup", this.key_up);
    const element = this.domElement;
    element.removeEventListener("pointerdown", this.pointer_down);
    element.removeEventListener("pointermove", this.pointer_move);
    element.removeEventListener("pointerup", this.pointer_up);
    element.removeEventListener("pointercancel", this.pointer_up);
    element.style.touchAction = "";
    this.clear_input();
  }
  clear_input() {
    this.keys.clear();
    this.angular_velocity.set(0, 0, 0);
    this.mouse.x = this.mouse.y = 0;
    this.dragging = false;
  }
  set_throttle(value) {
    if (!Number.isFinite(value)) return;
    this.throttle = clamp(value, 0, 1);
    this.dispatchEvent({ type: "statechange" });
  }
  set_sensitivity(value) {
    if (!Number.isFinite(value)) return;
    this.sensitivity = clamp(value, 0.25, 2);
    this.dispatchEvent({ type: "statechange" });
  }
  set_paused(paused) {
    this.paused = Boolean(paused);
    if (this.paused) {
      this.speed = 0;
      this.clear_input();
    }
    this.dispatchEvent({ type: "statechange" });
  }
  key_down = (event) => {
    if (
      !this.enabled ||
      !FLIGHT_KEYS.has(event.code) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    event.preventDefault?.();
    if (event.code === "Space") {
      if (!event.repeat) this.set_paused(!this.paused);
    } else this.keys.add(event.code);
  };
  key_up = (event) => this.keys.delete(event.code);
  pointer_down = (event) => {
    if (!this.enabled || this.paused || event.button !== 0) return;
    this.dragging = true;
    this.domElement.setPointerCapture?.(event.pointerId);
  };
  pointer_move = (event) => {
    if (!this.dragging || !this.enabled || this.paused) return;
    this.mouse.x += event.movementX || 0;
    this.mouse.y += event.movementY || 0;
  };
  pointer_up = () => {
    this.dragging = false;
  };
  update(delta = 0) {
    if (!this.enabled || this.paused || !Number.isFinite(delta) || delta <= 0)
      return;
    const dt = Math.min(delta, 0.05),
      axis = (positive, negative) =>
        Number(this.keys.has(positive)) - Number(this.keys.has(negative));
    const throttle_delta = axis("KeyW", "KeyS") * 0.25 * dt;
    if (throttle_delta) this.set_throttle(this.throttle + throttle_delta);
    const target = this.throttle * MAX_SPEED,
      previous = this.speed;
    const tau = target > previous ? 1.5 : 1;
    const decay = Math.exp(-dt / tau);
    this.speed = target + (previous - target) * decay;
    const distance = target * dt + (previous - target) * tau * (1 - decay);
    const right = new Vector3(1, 0, 0).applyQuaternion(this.object.quaternion);
    const turn = new Vector3(
      axis("ArrowUp", "ArrowDown"),
      axis("KeyA", "KeyD") + (right.y * 0.4 * this.speed) / MAX_SPEED,
      axis("ArrowLeft", "ArrowRight") + axis("KeyQ", "KeyE"),
    ).multiplyScalar(0.65 * this.sensitivity);
    this.angular_velocity.lerp(turn, 1 - Math.exp(-dt / 0.15));
    const rotation = new Quaternion().setFromEuler(
      new Euler(
        this.angular_velocity.x * dt - this.mouse.y * 0.003 * this.sensitivity,
        this.angular_velocity.y * dt - this.mouse.x * 0.003 * this.sensitivity,
        this.angular_velocity.z * dt,
        "YXZ",
      ),
    );
    this.mouse.x = this.mouse.y = 0;
    const changed = distance > 0 || rotation.angleTo(new Quaternion()) > 1e-10;
    this.object.quaternion.multiply(rotation).normalize();
    this.object.translateZ(-distance);
    this.object.up.set(0, 1, 0).applyQuaternion(this.object.quaternion);
    if (changed) this.dispatchEvent({ type: "change" });
  }
}
