import { useState } from "react";
import { COMPONENT_SCATTER_ALGORITHM } from "@fracto/sdk/FractoComponentScatter.js";
import {
  ComponentToolField as Field,
  component_vector,
  construction_text as text,
} from "./ComponentToolFields.jsx";
export default function ComponentScatterTools({
  rule,
  material,
  execute,
  busy,
  on_error,
  on_select,
}) {
  const [seed, set_seed] = useState(String(rule?.seed ?? 1)),
    [count, set_count] = useState(String(rule?.count ?? 20));
  const [bounds, set_bounds] = useState(
    (rule?.bounds || [-10, -10, 10, 10]).join(", "),
  );
  const [scale, set_scale] = useState((rule?.scale || [0.8, 1.2]).join(", "));
  const [exclusions, set_exclusions] = useState(
    (rule?.exclusions || []).map((box) => box.join(", ")).join("\n"),
  );
  const apply = (event) => {
    event.preventDefault();
    try {
      const asset =
        rule?.asset ||
        (material
          ? { id: material.material.id, revision: material.material.revision }
          : null);
      if (!asset) throw new Error("choose_material");
      const id = rule?.id || crypto.randomUUID();
      void execute([
        {
          type: "scatter",
          rule: {
            id,
            asset,
            algorithm: COMPONENT_SCATTER_ALGORITHM,
            group_id: rule?.group_id || null,
            seed: seed.trim() ? Number(seed) : NaN,
            count: count.trim() ? Number(count) : NaN,
            bounds: component_vector(bounds, 4),
            scale: component_vector(scale, 2),
            exclusions: exclusions.trim()
              ? exclusions
                  .split("\n")
                  .filter((line) => line.trim())
                  .map((line) => component_vector(line, 4))
              : [],
          },
        },
      ]);
      on_select(id);
    } catch (error) {
      on_error(error.message);
    }
  };
  return (
    <details open={!!rule}>
      <summary>{text("scatter")}</summary>
      <form onSubmit={apply}>
        <fieldset disabled={busy}>
          <Field label="seed" type="number" value={seed} on_change={set_seed} />
          <Field
            label="count"
            type="number"
            value={count}
            on_change={set_count}
          />
          <Field label="bounds" value={bounds} on_change={set_bounds} />
          <Field label="scatter_scale" value={scale} on_change={set_scale} />
          <label>
            {text("exclusions")}
            <textarea
              rows={3}
              maxLength={4000}
              value={exclusions}
              onChange={(event) => set_exclusions(event.target.value)}
            />
          </label>
          <p>{text("scatter_help")}</p>
          <button
            type="submit"
            disabled={
              !rule &&
              (!material?.material.placement_ready ||
                material.material.construction.kind !== "model" ||
                material.material.construction.placement !== "ground")
            }
          >
            {text(rule ? "update_scatter" : "scatter")}
          </button>
        </fieldset>
      </form>
    </details>
  );
}
