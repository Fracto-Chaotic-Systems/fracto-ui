import AppText from "../../AppText.jsx";
import { COMPONENT_STAGE_TEXT } from "../../text/GamesText.jsx";
import {
  component_lighting,
  DEFAULT_COMPONENT_AMBIENT,
} from "@fracto/sdk/FractoComponentDocument.js";
import { StageLightingGroup } from "./ComponentStageStyles.jsx";
import {
  PreviewLightingControls,
  PreviewRange,
  PREVIEW_RANGES,
} from "./InventoryPreviewControls.jsx";

/** The shared light controls, stored in the component document's lighting. */
export default function ComponentStageLightingControls({
  document,
  on_change,
  disabled,
  hidden,
}) {
  const lighting = component_lighting(document);
  return (
    <StageLightingGroup
      role="group"
      aria-label={AppText.get(COMPONENT_STAGE_TEXT.stage_lighting)}
      hidden={hidden}
    >
      <PreviewLightingControls
        direction={lighting.direction_degrees}
        intensity={lighting.intensity}
        disabled={disabled}
        on_change={(field, value) =>
          on_change({
            ...document,
            lighting: {
              ...lighting,
              [field === "direction" ? "direction_degrees" : "intensity"]:
                value,
            },
          })
        }
      />
      <PreviewRange
        label={AppText.get(COMPONENT_STAGE_TEXT.stage_ambient)}
        value={lighting.ambient ?? DEFAULT_COMPONENT_AMBIENT}
        {...PREVIEW_RANGES.ambient}
        disabled={disabled}
        on_change={(value) =>
          on_change({
            ...document,
            lighting: {
              ...lighting,
              ambient: Math.round(value * 10) / 10,
            },
          })
        }
      />
    </StageLightingGroup>
  );
}
