import { useState } from "react";
import {
  ComponentToolField as Field,
  component_vector,
  construction_text as text,
} from "./ComponentToolFields.jsx";
export default function ComponentFloorTools({
  floor,
  material,
  execute,
  busy,
  on_error,
}) {
  const [size, set_size] = useState((floor?.size || [20, 20]).join(", "));
  const [repeat, set_repeat] = useState(
    (floor?.texture_repeat || [1, 1]).join(", "),
  );
  const [textured, set_textured] = useState(!!floor?.asset);
  const [file, set_file] = useState(floor?.texture_file || "");
  const surface =
    material?.material.construction.kind === "surface" ? material : null;
  const images = (
    surface?.runtime.resources || [floor?.texture_file].filter(Boolean)
  ).filter((value) => /\.(png|jpe?g|webp)$/i.test(value));
  const apply = (event) => {
    event.preventDefault();
    try {
      if (textured && (!file || (!surface && !floor?.asset)))
        throw new Error("floor_texture_missing");
      void execute([
        {
          type: "set-floor",
          floor: {
            asset: textured
              ? surface
                ? {
                    id: surface.material.id,
                    revision: surface.material.revision,
                  }
                : floor.asset
              : null,
            texture_file: textured ? file : null,
            size: component_vector(size, 2),
            texture_repeat: component_vector(repeat, 2),
          },
        },
      ]);
    } catch (error) {
      on_error(error.message);
    }
  };
  return (
    <details>
      <summary>{text("floor")}</summary>
      <form onSubmit={apply}>
        <fieldset disabled={busy}>
          <Field label="floor_size" value={size} on_change={set_size} />
          <label>
            <input
              type="checkbox"
              checked={textured}
              onChange={(event) => set_textured(event.target.checked)}
            />
            {text("textured_floor")}
          </label>
          {textured && (
            <>
              <label>
                {text("texture_file")}
                <select
                  value={file}
                  onChange={(event) => set_file(event.target.value)}
                >
                  <option value="">{text("select_texture")}</option>
                  {images.map((image) => (
                    <option key={image} value={image}>
                      {image}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="texture_repeat"
                value={repeat}
                on_change={set_repeat}
              />
              <button
                type="button"
                disabled={!material?.material.construction.texture_size_m}
                onClick={() => {
                  try {
                    const values = component_vector(size, 2);
                    set_repeat(
                      values
                        .map(
                          (value, i) =>
                            value /
                            material.material.construction.texture_size_m[i],
                        )
                        .join(", "),
                    );
                  } catch (error) {
                    on_error(error.message);
                  }
                }}
              >
                {text("physical_tiling")}
              </button>
            </>
          )}
          <p>{text("floor_help")}</p>
          <button type="submit">{text("apply_floor")}</button>
        </fieldset>
      </form>
    </details>
  );
}
