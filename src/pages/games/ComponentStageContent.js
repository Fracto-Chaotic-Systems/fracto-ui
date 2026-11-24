import * as THREE from "three";
import { create_component_animation } from "./ComponentStageAnimation.js";
import {
  component_reference_key,
  validate_component_materials,
} from "@fracto/sdk/FractoComponentTools.js";
import { generate_component_scatter } from "@fracto/sdk/FractoComponentScatter.js";
import { validate_component_document } from "@fracto/sdk/FractoComponentDocument.js";
import { sample_component_motion } from "@fracto/sdk/FractoComponentMotion.js";
import { resolve_component_references } from "./ComponentMaterialApi.js";
import {
  load_inventory_model,
  inventory_file_url,
} from "./InventoryModelLoader.js";
import { repair_fbx_cutouts } from "./InventoryMaterialPreview.js";
import {
  oriented_component_instance,
  dispose_component_resources,
} from "./ComponentStageGeometry.js";

export function create_component_content({
  scene,
  render,
  on_status,
  resolve = resolve_component_references,
  load = load_inventory_model,
}) {
  let root = new THREE.Group(),
    generation = 0,
    disposed = false,
    last = null,
    controller = null,
    floor_resources = null,
    animation = create_component_animation(),
    motions = [],
    elapsed = 0,
    playback_speed = 1;
  const cache = new Map();
  const failed_refs = new Set();
  scene.add(root);
  let active_refs = new Set();
  const clear = () => {
    animation.dispose();
    motions = [];
    elapsed = 0;
    dispose_component_resources(root, false);
    if (floor_resources) {
      floor_resources.geometry.dispose();
      floor_resources.material.map?.dispose();
      floor_resources.material.dispose();
      floor_resources = null;
    }
    root.clear();
  };
  const prototype = (descriptor) => {
    const key = component_reference_key(descriptor.material);
    if (failed_refs.has(key)) throw new Error("material_load_error");
    if (!cache.has(key)) {
      if (!descriptor.runtime.model) throw new Error("material_load_error");
      let model,
        resource_failed = false;
      const ready = () => {
        if (!disposed && model) {
          repair_fbx_cutouts(model, descriptor.runtime.format);
          render();
        }
      };
      let promise;
      promise = load(descriptor.runtime, ready, () => {
        if (promise && cache.get(key) !== promise) return;
        resource_failed = true;
        failed_refs.add(key);
        if (!disposed && active_refs.has(key)) {
          root.visible = false;
          on_status("material_load_error");
          render();
        }
      })
        .then((loaded) => {
          model = loaded;
          if (disposed || resource_failed) {
            dispose_component_resources(model);
            throw new Error("material_load_error");
          }
          repair_fbx_cutouts(model, descriptor.runtime.format);
          return model;
        })
        .catch((error) => {
          if (cache.get(key) === promise) cache.delete(key);
          throw error;
        });
      cache.set(key, promise);
    }
    return cache.get(key);
  };
  return {
    get root() {
      return root;
    },
    get animated() {
      return (
        !disposed &&
        root.visible &&
        (animation.active || (playback_speed > 0 && motions.length > 0))
      );
    },
    animate(delta) {
      animation.update(delta);
      elapsed += delta * playback_speed;
      for (const { node, object } of motions) {
        const pose = sample_component_motion(object, elapsed);
        node.position.fromArray(pose.position);
        node.rotation.fromArray([...pose.rotation, "XYZ"]);
      }
    },
    async update(document, { clip_rates = {} } = {}) {
      const signature = JSON.stringify([
        document.floor,
        document.objects,
        document.scatters,
        document.animation_speed ?? 1,
        clip_rates,
      ]);
      if (signature === last || disposed) return;
      last = signature;
      const token = ++generation;
      controller?.abort();
      controller = new AbortController();
      clear();
      render();
      on_status("loading_content");
      const next = new THREE.Group();
      const next_animation = create_component_animation();
      const next_motions = [];
      let floor = null;
      try {
        validate_component_document(document);
        const descriptors = await resolve(
          [
            document.floor?.asset,
            ...document.objects.map((item) => item.asset),
            ...document.scatters.map((rule) => rule.asset),
          ],
          controller.signal,
        );
        if (disposed || token !== generation) return;
        active_refs = new Set(Object.keys(descriptors));
        for (const [key, promise] of cache)
          if (!active_refs.has(key)) {
            cache.delete(key);
            promise
              .then((model) => dispose_component_resources(model))
              .catch(() => {});
          }
        validate_component_materials(document, descriptors);
        const model_descriptors = Object.values(descriptors).filter(
          (entry) => entry.material.construction.kind === "model",
        );
        for (let i = 0; i < model_descriptors.length; i += 4) {
          if (disposed || token !== generation) return;
          await Promise.all(model_descriptors.slice(i, i + 4).map(prototype));
        }
        if (disposed || token !== generation) return;
        if (document.floor) {
          const { size, texture_repeat, asset, texture_file } = document.floor;
          const material = new THREE.MeshStandardMaterial({
            color: asset ? 0xffffff : 0xc8c4b8,
            roughness: 1,
          });
          floor = new THREE.Mesh(new THREE.PlaneGeometry(...size), material);
          floor.userData.component_item_id = "floor";
          floor.rotation.x = -Math.PI / 2;
          floor.position.y = -0.005;
          floor.receiveShadow = true;
          if (asset) {
            const descriptor = descriptors[component_reference_key(asset)];
            const texture = await new THREE.TextureLoader().loadAsync(
              inventory_file_url(descriptor.runtime, texture_file),
            );
            material.map = texture;
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.fromArray(texture_repeat);
          }
          next.add(floor);
        }
        for (const item of document.objects) {
          const descriptor = descriptors[component_reference_key(item.asset)];
          const source = await prototype(descriptor);
          const placed = oriented_component_instance(
            source,
            descriptor.material.construction,
            item,
            item.id,
            (model) =>
              next_animation.add(
                source,
                model,
                clip_rates[item.id] ?? 1,
                item.animation_speed,
              ),
          );
          next.add(placed);
          if (item.motion) next_motions.push({ node: placed, object: item });
        }
        for (const rule of document.scatters) {
          const descriptor = descriptors[component_reference_key(rule.asset)],
            source = await prototype(descriptor);
          for (const transform of generate_component_scatter(
            rule,
            descriptor.material.construction,
          ))
            next.add(
              oriented_component_instance(
                source,
                descriptor.material.construction,
                transform,
                rule.id,
                (model) => next_animation.add(source, model),
              ),
            );
        }
        if (disposed || token !== generation) {
          next_animation.dispose();
          dispose_component_resources(next, false);
          if (floor) {
            floor.geometry.dispose();
            floor.material.map?.dispose();
            floor.material.dispose();
          }
          return;
        }
        scene.remove(root);
        root = next;
        animation = next_animation;
        motions = next_motions;
        playback_speed = document.animation_speed ?? 1;
        animation.start(playback_speed);
        floor_resources = floor;
        scene.add(root);
        render();
        on_status("content_ready");
      } catch (error) {
        next_animation.dispose();
        dispose_component_resources(next, false);
        if (floor) {
          floor.geometry.dispose();
          floor.material.map?.dispose();
          floor.material.dispose();
        }
        if (!disposed && token === generation)
          on_status(
            [
              "material_revision_changed",
              "material_not_calibrated",
              "floor_texture_missing",
              "scatter_cannot_fit",
              "construction_limit",
            ].includes(error.message)
              ? error.message
              : "material_load_error",
          );
      }
    },
    dispose() {
      disposed = true;
      ++generation;
      controller?.abort();
      clear();
      scene.remove(root);
      cache.forEach((promise) =>
        promise
          .then((model) => dispose_component_resources(model))
          .catch(() => {}),
      );
      cache.clear();
    },
  };
}
