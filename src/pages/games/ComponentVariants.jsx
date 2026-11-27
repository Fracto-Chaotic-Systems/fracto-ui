import { useEffect, useState } from "react";
import AppText from "../../AppText.jsx";
import { COMPONENT_STAGE_TEXT } from "../../text/GamesText.jsx";
import { InventoryCaption } from "./InventoryStyles.jsx";
import { component_request } from "./ComponentDocumentApi.js";
import { VariantButton, StageVariants } from "./ComponentStageStyles.jsx";

const text = (key) => AppText.get(COMPONENT_STAGE_TEXT[key]);
const properties = {
  "motion.speed_mps": "variant_movement",
  "walk_clip.playback_rate": "variant_walk",
  "motion.algorithm": "variant_route",
};

export default function ComponentVariants({
  component_id,
  selected_key = null,
  on_select,
}) {
  const [state, set_state] = useState({
    id: component_id,
    loading: true,
    variants: [],
  });
  const [attempt, set_attempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    component_request(`/${encodeURIComponent(component_id)}/variants`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (!Array.isArray(result.variants)) throw new Error("request_error");
        if (!controller.signal.aborted)
          set_state({ id: component_id, variants: result.variants });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          set_state({ id: component_id, variants: [], failed: true });
      });
    return () => controller.abort();
  }, [component_id, attempt]);
  const current =
    state.id === component_id ? state : { loading: true, variants: [] };
  return (
    <StageVariants aria-label={text("variants")}>
      <strong>{text("variants")}</strong>
      {current.loading && <span role="status">{text("variants_loading")}</span>}
      {current.failed && (
        <div role="alert">
          {text("variants_error")}{" "}
          <button
            onClick={() => {
              set_state({ id: component_id, loading: true, variants: [] });
              set_attempt((value) => value + 1);
            }}
          >
            {text("retry")}
          </button>
        </div>
      )}
      {!current.loading && !current.failed && !current.variants.length && (
        <InventoryCaption>{text("variants_empty")}</InventoryCaption>
      )}
      {current.variants.length > 0 && (
        <ul>
          {current.variants.map((variant) => (
            <li key={variant.key}>
              <VariantButton
                type="button"
                aria-pressed={selected_key === variant.key}
                onClick={() => on_select(variant)}
              >
                {variant.name}
              </VariantButton>
              <ul>
                {variant.overrides.map((override, index) => (
                  <li key={index}>
                    {properties[override.target.property]
                      ? text(properties[override.target.property])
                      : override.target.property}
                    {": "}
                    {override.target.property === "motion.algorithm"
                      ? text(
                          override.value === "facing-wander-v1"
                            ? "variant_wander"
                            : "variant_patrol",
                        )
                      : override.operation === "multiply"
                        ? `${override.value}×`
                        : `${text(`variant_${override.operation}`)} ${override.value ?? ""}`}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </StageVariants>
  );
}
