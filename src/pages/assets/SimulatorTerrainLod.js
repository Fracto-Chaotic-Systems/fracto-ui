import * as THREE from "three";
import { request_lod_plan } from "@fracto/sdk/terrain/Lod.js";

export const MAX_NEARBY_PATCHES = 8;

/** Prioritize visible, nearby patches whose base samples occupy more than a screen pixel. */
export function nearby_refinements(
  plan,
  camera,
  viewport_height,
  current = new Set(),
  blocked = new Set(),
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
  return (plan.refinements || [])
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
      return {
        id: group.id,
        eligible:
          frustum.intersectsBox(box) &&
          distance < Math.max(size * 6, 0.35) * (held ? 1.25 : 1) &&
          density > (held ? 0.8 : 1.25),
        priority: distance * (held ? 0.85 : 1),
      };
    })
    .filter((group) => group.eligible)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
    .slice(0, MAX_NEARBY_PATCHES)
    .map((group) => group.id)
    .sort();
}

/** Throttled camera updates; one detail request at a time, with safe fallback on failed quartets. */
export default class SimulatorTerrainLod {
  constructor({ camera, viewport_height, on_change }) {
    Object.assign(this, { camera, viewport_height, on_change });
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
