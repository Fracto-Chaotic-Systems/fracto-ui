import { useState } from "react";
import {
  ComponentToolField as Field,
  component_vector,
  construction_text as text,
} from "./ComponentToolFields.jsx";
export default function ComponentPlacementTools({
  object,
  material,
  execute,
  busy,
  on_error,
  on_select,
}) {
  const [position, set_position] = useState(
    (object?.position || [0, 0, 0]).join(", "),
  );
  const [rotation, set_rotation] = useState(
    (object?.rotation || [0, 0, 0])
      .map((value) => (value * 180) / Math.PI)
      .join(", "),
  );
  const [scale, set_scale] = useState((object?.scale || [1, 1, 1]).join(", "));
  const apply = (event) => {
    event.preventDefault();
    try {
      const transform = {
        position: component_vector(position, 3),
        rotation: component_vector(rotation, 3).map(
          (value) => (value * Math.PI) / 180,
        ),
        scale: component_vector(scale, 3),
      };
      if (object)
        void execute([{ type: "transform", id: object.id, ...transform }]);
      else {
        if (!material) throw new Error("choose_material");
        const id = crypto.randomUUID();
        void execute([
          {
            type: "place",
            object: {
              id,
              asset: {
                id: material.material.id,
                revision: material.material.revision,
              },
              group_id: null,
              ...transform,
            },
          },
        ]);
        on_select(id);
      }
    } catch (error) {
      on_error(error.message);
    }
  };
  return (
    <details open={!!object}>
      <summary>{text(object ? "transform" : "place")}</summary>
      <form onSubmit={apply}>
        <fieldset disabled={busy}>
          <Field label="position" value={position} on_change={set_position} />
          <Field label="rotation" value={rotation} on_change={set_rotation} />
          <Field label="scale" value={scale} on_change={set_scale} />
          <button
            type="submit"
            disabled={
              !object &&
              (!material?.material.placement_ready ||
                material.material.construction.kind !== "model")
            }
          >
            {text(object ? "apply_transform" : "place")}
          </button>
        </fieldset>
      </form>
    </details>
  );
}
