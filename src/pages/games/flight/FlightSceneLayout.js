export const FLIGHT_FRAME_RIM_PX = 36;
export const FLIGHT_FRAME_TOP_PX = 16;
export const FLIGHT_FRAME_BOTTOM_PX = 28;

/** Glass and casing dimensions; fill projection must use the inner glass aspect. */
export function flight_scene_layout(width, height, mode = "fill") {
  const scene_mode = ["porthole", "640x480"].includes(mode) ? mode : "fill";
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    return {
      mode: scene_mode,
      glass_width_px: 0,
      glass_height_px: 0,
      frame_width_px: 0,
      frame_height_px: 0,
    };
  const glass_width_px =
    scene_mode === "fill"
      ? Math.max(1, width - FLIGHT_FRAME_TOP_PX * 2 - FLIGHT_FRAME_RIM_PX * 2)
      : 640;
  const glass_height_px =
    scene_mode === "fill"
      ? Math.max(
          1,
          height -
            FLIGHT_FRAME_TOP_PX -
            FLIGHT_FRAME_BOTTOM_PX -
            FLIGHT_FRAME_RIM_PX * 2,
        )
      : scene_mode === "porthole"
        ? 640
        : 480;
  return {
    mode: scene_mode,
    glass_width_px,
    glass_height_px,
    frame_width_px: glass_width_px + FLIGHT_FRAME_RIM_PX * 2,
    frame_height_px: glass_height_px + FLIGHT_FRAME_RIM_PX * 2,
  };
}
