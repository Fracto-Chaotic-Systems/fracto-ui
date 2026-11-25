import * as THREE from "three";
import { component_reference_key } from "@fracto/sdk/FractoComponentTools.js";
import { generate_component_scatter } from "@fracto/sdk/FractoComponentScatter.js";
import { create_component_content } from "./ComponentStageContent.js";
import { load_inventory_model } from "./InventoryModelLoader.js";
import { dispose_component_resources } from "./ComponentStageGeometry.js";

// Playback residency only. Authored placements, scatter seeds and motion stay intact.
export function component_sections(document, descriptors, length = 1) {
  const sections = new Map();
  const objects = [...document.objects];
  for (const rule of document.scatters) {
    const facts =
      descriptors[component_reference_key(rule.asset)].material.construction;
    for (const [index, transform] of generate_component_scatter(
      rule,
      facts,
    ).entries())
      objects.push({
        ...transform,
        asset: rule.asset,
        id: `${rule.id.slice(0, 24)}${index.toString(16).padStart(12, "0")}`,
        group_id: rule.group_id,
      });
  }
  for (const object of objects) {
    const facts =
      descriptors[component_reference_key(object.asset)].material.construction;
    const radius =
      (Math.hypot(...facts.dimensions_m) +
        Math.hypot(...facts.ground_anchor_m)) *
      Math.max(...object.scale);
    const end =
      object.position[2] +
      Math.cos(object.rotation[1]) * (object.motion?.distance_m ?? 0);
    // Independent material groups reveal grass/rocks as each prototype arrives.
    const key = `${Math.floor(object.position[2] / length)}:${component_reference_key(object.asset)}`;
    if (!sections.has(key))
      sections.set(key, {
        key,
        objects: [],
        min: Infinity,
        max: -Infinity,
        reach: 0,
      });
    const section = sections.get(key);
    section.objects.push(object);
    section.min = Math.min(
      section.min,
      object.position[2] - radius,
      end - radius,
    );
    section.max = Math.max(
      section.max,
      object.position[2] + radius,
      end + radius,
    );
    // Include offscreen shadow casters at the component light's fixed 4:3 elevation.
    section.reach = Math.max(section.reach, (radius * 4) / 3 + 0.05);
  }
  return [...sections.values()];
}

export function create_component_section_content({
  scene,
  render,
  on_status,
  resolve,
  load = load_inventory_model,
}) {
  const root = new THREE.Group(),
    cache = new Map(),
    queued = [];
  scene.add(root);
  let disposed = false,
    failed = false,
    generation = 0,
    revision = 0,
    active = 0;
  let sections = [],
    contents = [],
    elapsed = 0,
    document,
    descriptors;
  const pump = () => {
    while (!disposed && active < 4 && queued.length) {
      const task = queued.shift();
      active++;
      Promise.resolve()
        .then(task.run)
        .then(task.resolve, task.reject)
        .finally(() => {
          active--;
          pump();
        });
    }
  };
  const shared_load = (asset, ready, error) => {
    const key = asset.file_urls?.[asset.model] ?? `${asset.id}:${asset.model}`;
    if (!cache.has(key)) {
      const promise = new Promise((resolve, reject) => {
        queued.push({
          resolve,
          reject,
          run: () =>
            load(
              asset,
              () => {
                if (!disposed) render();
              },
              error,
            ),
        });
        pump();
      });
      cache.set(key, promise);
    }
    return cache.get(key).then((model) => {
      ready?.();
      return model;
    });
  };
  const child = () => {
    const content = create_component_content({
      scene: root,
      render,
      on_status: (status) => {
        if (
          !["loading_content", "content_ready"].includes(status) &&
          !disposed
        ) {
          failed = true;
          on_status(status);
        }
      },
      resolve: async (references) =>
        Object.fromEntries(
          references.filter(Boolean).map((ref) => {
            const key = component_reference_key(ref);
            return [key, descriptors[key]];
          }),
        ),
      load: shared_load,
      own_prototypes: false,
    });
    contents.push(content);
    return content;
  };
  const subset = (objects, floor = null) => ({
    ...document,
    floor,
    objects,
    scatters: [],
  });
  const ensure = (section) => {
    if (section.promise) return section.promise;
    const token = generation,
      content = child();
    section.promise = content.update(subset(section.objects)).then(() => {
      if (disposed || failed || token !== generation) return;
      content.animate(elapsed);
      section.ready = true;
      revision++;
      render();
    });
    return section.promise;
  };
  const required = (pose, radius, extra = 0) =>
    sections
      .filter(
        (s) =>
          s.min - s.reach <= pose.position[2] + radius + extra &&
          s.max + s.reach >= pose.position[2] - radius - extra,
      )
      .sort(
        (a, b) =>
          Math.abs((a.min + a.max) / 2 - pose.position[2]) -
          Math.abs((b.min + b.max) / 2 - pose.position[2]),
      );
  return {
    root,
    get revision() {
      return revision;
    },
    animate(delta) {
      elapsed += delta;
      for (const content of contents) content.animate(delta);
    },
    focus(pose, radius) {
      if (disposed || failed || !document) return false;
      const visible = required(pose, radius);
      for (const section of visible) ensure(section);
      // A full extra metre is ~100 seconds of travel at the strip's current speed.
      for (const section of required(pose, radius, 1)) ensure(section);
      return visible.every((section) => section.ready);
    },
    async update(value, pose, radius) {
      if (document) throw new Error("runtime_stream_already_initialized");
      document = value;
      const token = ++generation;
      on_status("loading_content");
      descriptors = await resolve([
        document.floor?.asset,
        ...document.objects.map((o) => o.asset),
        ...document.scatters.map((s) => s.asset),
      ]);
      if (disposed || token !== generation) return;
      sections = component_sections(document, descriptors);
      const floor = child();
      // Dirt can render while the first model prototypes download and decode.
      const floor_ready = floor.update(subset([], document.floor)).then(() => {
        revision++;
        render();
      });
      await Promise.all([floor_ready, ...required(pose, radius).map(ensure)]);
      if (!disposed && !failed && token === generation)
        on_status("content_ready");
    },
    dispose() {
      disposed = true;
      generation++;
      for (const task of queued.splice(0))
        task.reject(new Error("runtime_stream_disposed"));
      for (const content of contents) content.dispose();
      scene.remove(root);
      for (const promise of cache.values())
        promise
          .then((model) => dispose_component_resources(model))
          .catch(() => {});
      cache.clear();
    },
  };
}
