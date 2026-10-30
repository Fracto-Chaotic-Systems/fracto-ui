import * as THREE from "three";
import { request_lod_plan } from "@fracto/sdk/terrain/Lod.js";

export const MAX_NEARBY_PATCHES = 8;
export const FLIGHT_LOOKAHEAD_SECONDS = 2;
export const MAX_LOOKAHEAD_PATCHES = 2;

/** Prioritize visible, nearby patches whose base samples occupy more than a screen pixel. */
export function nearby_refinements(
  plan,
  camera,
  viewport_height,
  current = new Set(),
  blocked = new Set(),
  motion = null,
) {
  camera.updateMatrixWorld();
  const frustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    ),
  );
  const { focal_point, scope } = plan.region;
  const factor =
    viewport_height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  const ahead = Number.isFinite(motion?.speed)
    ? Math.min(Math.max(0, motion.speed) * FLIGHT_LOOKAHEAD_SECONDS, 0.4)
    : 0;
  const direction = camera.getWorldDirection(new THREE.Vector3());
  const futurePosition = camera.position
    .clone()
    .addScaledVector(direction, ahead);
  const futureWorld = camera.matrixWorld.clone().setPosition(futurePosition);
  const futureFrustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      futureWorld.invert(),
    ),
  );
  const candidates = (plan.refinements || [])
    .filter((group) => !blocked.has(group.id))
    .map((group) => {
      const b = group.bounds,
        size = (b.right - b.left) / scope;
      const box = new THREE.Box3(
        new THREE.Vector3(
          (b.left - focal_point.x) / scope,
          0,
          (focal_point.y - b.top) / scope,
        ),
        new THREE.Vector3(
          (b.right - focal_point.x) / scope,
          1 / 25,
          (focal_point.y - b.bottom) / scope,
        ),
      );
      const distance = Math.max(box.distanceToPoint(camera.position), 0.0001);
      const held = current.has(group.id);
      const density = ((size / 256) * factor) / distance;
      const center = box.getCenter(new THREE.Vector3());
      const along = center.clone().sub(camera.position).dot(direction);
      const pathPosition = camera.position
        .clone()
        .addScaledVector(direction, THREE.MathUtils.clamp(along, 0, ahead));
      const futureDistance = Math.max(
        Math.min(
          box.distanceToPoint(futurePosition),
          box.distanceToPoint(pathPosition),
        ),
        0.0001,
      );
      const futureDensity = ((size / 256) * factor) / futureDistance;
      const visible =
        frustum.intersectsBox(box) &&
        distance < Math.max(size * 6, 0.35) * (held ? 1.25 : 1) &&
        density > (held ? 0.8 : 1.25);
      const predicted =
        ahead > 0 &&
        along > 0 &&
        (futureFrustum.intersectsBox(box) ||
          box.distanceToPoint(pathPosition) < Math.max(size * 0.75, 0.015)) &&
        futureDistance < Math.max(size * 6, 0.35) * (held ? 1.25 : 1) &&
        futureDensity > (held ? 0.8 : 1.25);
      return {
        id: group.id,
        visible,
        predicted,
        priority:
          (ahead > 0 ? distance * 0.75 + futureDistance * 0.25 : distance) *
          (held ? 0.85 : 1),
        ahead_priority:
          (futureDistance + Math.min(along, ahead) * 0.25) * (held ? 0.85 : 1),
      };
    });
  // Reserve only two slots for predictive-only detail; visible detail keeps the rest.
  const predictive = candidates
    .filter((group) => group.predicted && !group.visible)
    .sort(
      (a, b) => a.ahead_priority - b.ahead_priority || a.id.localeCompare(b.id),
    )
    .slice(0, MAX_LOOKAHEAD_PATCHES);
  const visible = candidates
    .filter((group) => group.visible)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
    .slice(0, MAX_NEARBY_PATCHES - predictive.length);
  return [...visible, ...predictive].map((group) => group.id).sort();
}

/** Throttled camera updates; one detail request at a time, with safe fallback on failed quartets. */
export default class SimulatorTerrainLod {
  constructor({ camera, viewport_height, on_change, motion = () => null }) {
    Object.assign(this, { camera, viewport_height, on_change, motion });
    this.generation = 0;
  }
  reset() {
    clearTimeout(this.timer);
    this.timer = null;
    this.dirty = false;
    this.generation++;
    this.plan = null;
    this.pending = false;
    this.current = new Set();
    this.blocked = new Set();
  }
  set_plan(plan) {
    this.reset();
    this.plan = plan;
    this.schedule();
  }
  schedule = () => {
    if (this.plan && !this.timer)
      this.timer = setTimeout(() => {
        this.timer = null;
        this.update();
      }, 250);
  };
  update = async () => {
    if (!this.plan) return;
    if (this.pending) {
      this.dirty = true;
      return;
    }
    this.dirty = false;
    const ids = nearby_refinements(
      this.plan,
      this.camera,
      this.viewport_height(),
      this.current,
      this.blocked,
      this.motion(),
    );
    if (JSON.stringify(ids) === JSON.stringify([...this.current].sort()))
      return;
    const generation = this.generation;
    let reschedule = true;
    this.pending = true;
    try {
      const result = await this.on_change(request_lod_plan(this.plan, ids));
      if (generation !== this.generation) return;
      const actual = new Set(result?.refined_groups || []);
      if (
        JSON.stringify([...actual].sort()) ===
        JSON.stringify([...this.current].sort())
      )
        reschedule = false;
      for (const id of ids) if (!actual.has(id)) this.blocked.add(id);
      this.current = actual;
    } catch {
      reschedule = false;
      for (const id of ids) if (!this.current.has(id)) this.blocked.add(id);
    } finally {
      if (generation === this.generation) {
        this.pending = false;
        if (reschedule || this.dirty) this.schedule();
      }
    }
  };
  dispose() {
    this.reset();
  }
}
