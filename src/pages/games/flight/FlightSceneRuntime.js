import { create_flight_resolution } from "./FlightResolution.js";
import { MAX_FLIGHT_FISHEYE_STRENGTH } from "./FlightLens.js";

/** Completion-driven painting. No subscriptions or per-frame React updates. */
export function start_flight_scene(
  canvas,
  flight_state,
  {
    create_client,
    on_error = () => {},
    on_frame = () => {},
    resolution_options = {},
    environment = { window, document },
  } = {},
) {
  const { window: target_window, document: target_document } = environment;
  const resolution = create_flight_resolution(resolution_options);
  let context = null,
    client = null,
    client_destroyed = false,
    active = true,
    failed = false,
    busy = false;
  let suspended = !!target_document.hidden,
    scheduled = null,
    revision = 0;
  let bounds = { width: 0, height: 0 },
    display_mode = "fill",
    fisheye_strength = 0,
    painted = 0;
  const usable = () =>
    active &&
    !failed &&
    !suspended &&
    !target_document.hidden &&
    bounds.width > 0 &&
    bounds.height > 0;
  const dispose_client = () => {
    if (client && !client_destroyed) {
      client_destroyed = true;
      client.destroy();
    }
  };
  const unschedule = () => {
    if (scheduled !== null) target_window.cancelAnimationFrame(scheduled);
    scheduled = null;
  };
  const fail = (error) => {
    if (!active || failed) return;
    failed = true;
    unschedule();
    dispose_client();
    on_error(error);
  };
  const schedule = () => {
    if (usable() && !busy && scheduled === null)
      scheduled = target_window.requestAnimationFrame(tick);
  };
  const tick = async () => {
    scheduled = null;
    if (!usable() || busy) return;
    const generation = revision;
    const viewport =
      display_mode === "porthole"
        ? { width_px: 640, height_px: 640 }
        : display_mode === "640x480"
          ? { width_px: 640, height_px: 480 }
          : resolution.viewport(
              bounds.width,
              bounds.height,
              target_window.devicePixelRatio,
            );
    busy = true;
    let frame = null;
    try {
      if (!context) context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Canvas rendering unavailable");
      if (!client) client = create_client();
      const start = target_window.performance.now();
      frame = await client.render(flight_state.get_snapshot(), {
        ...viewport,
        fisheye_strength,
      });
      if (!usable() || generation !== revision) return;
      const image = new target_window.ImageData(
        frame.pixels,
        frame.width_px,
        frame.height_px,
      );
      if (canvas.width !== frame.width_px) canvas.width = frame.width_px;
      if (canvas.height !== frame.height_px) canvas.height = frame.height_px;
      context.putImageData(image, 0, 0);
      painted++;
      resolution.observe(
        Math.max(
          frame.stats?.total_ms ?? 0,
          target_window.performance.now() - start,
        ),
      );
      on_frame(frame, resolution.get_stats());
    } catch (error) {
      if (generation === revision && error.name !== "AbortError") fail(error);
    } finally {
      if (frame) client?.release(frame);
      busy = false;
      schedule();
    }
  };
  const invalidate = () => {
    revision++;
    unschedule();
    try {
      client?.cancel();
    } catch (error) {
      fail(error);
    }
  };
  const blur = () => {
    suspended = true;
    invalidate();
  };
  const resume = () => {
    suspended = !!target_document.hidden;
    invalidate();
    schedule();
  };
  target_window.addEventListener("blur", blur);
  target_window.addEventListener("focus", resume);
  target_document.addEventListener("visibilitychange", resume);
  return {
    resize(width, height, mode = "fill", strength = 0) {
      const next_strength = Number.isFinite(strength)
        ? Math.max(0, Math.min(MAX_FLIGHT_FISHEYE_STRENGTH, strength))
        : 0;
      const next_mode =
        mode === "640x480" || mode === "porthole" ? mode : "fill";
      const next = {
        width: Number.isFinite(width) ? Math.max(0, width) : 0,
        height: Number.isFinite(height) ? Math.max(0, height) : 0,
      };
      if (
        next.width === bounds.width &&
        next.height === bounds.height &&
        next_mode === display_mode &&
        next_strength === fisheye_strength
      )
        return;
      display_mode = next_mode;
      fisheye_strength = next_strength;
      bounds = next;
      invalidate();
      schedule();
    },
    destroy() {
      if (!active) return;
      active = false;
      revision++;
      unschedule();
      dispose_client();
      target_window.removeEventListener("blur", blur);
      target_window.removeEventListener("focus", resume);
      target_document.removeEventListener("visibilitychange", resume);
    },
    get_stats: () => ({
      active,
      failed,
      busy,
      painted,
      ...resolution.get_stats(),
    }),
  };
}
