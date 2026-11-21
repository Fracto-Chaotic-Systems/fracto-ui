import { crt_image_reveal_rect } from "./CrtImageReveal.js";

export function crt_media_rect(
  source_width,
  source_height,
  width,
  height,
  fit = "contain",
) {
  if (!(source_width > 0 && source_height > 0 && width > 0 && height > 0))
    return null;
  const scale =
    fit === "cover"
      ? Math.max(width / source_width, height / source_height)
      : Math.min(width / source_width, height / source_height);
  const w = source_width * scale,
    h = source_height * scale;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}

export function crt_portrait_rect(
  source_width,
  source_height,
  width,
  height,
  time = 0,
  duration = 12,
  reduced_motion = false,
) {
  if (!(source_width > 0 && source_height > 0 && width > 0 && height > 0))
    return null;
  // Fill the viewport and show no more than the upper half initially.
  const scale = Math.max(width / source_width, (height * 2) / source_height);
  const w = source_width * scale,
    h = source_height * scale;
  const seconds = Math.max(2, Number(duration) || 12);
  const hold = Math.min(0.8, seconds * 0.15);
  const linear = reduced_motion
    ? 0
    : Math.max(0, Math.min(1, (time - hold) / (seconds - hold * 2)));
  const progress = linear * linear * (3 - 2 * linear);
  return {
    x: (width - w) / 2,
    y: progress === 0 ? 0 : (height - h) * progress,
    width: w,
    height: h,
  };
}

// URL sources are owned by the screen. Element sources belong to the caller;
// only our listeners are released, never their playback or stream resources.
export function prepare_crt_media(
  layer,
  { canvas_document, on_ready, on_error },
) {
  const owned = typeof layer.source === "string";
  const source = owned
    ? canvas_document.createElement(layer.type === "video" ? "video" : "img")
    : layer.source;
  let disposed = false,
    failed = false,
    playing = false,
    playback_error_reported = false,
    origin_checked = false;
  const ready = () => {
    origin_checked = false;
    if (!disposed) on_ready();
  };
  const fail = (error) => {
    if (disposed || failed) return;
    failed = true;
    on_error(error, layer);
  };
  source?.addEventListener?.("load", ready);
  source?.addEventListener?.("loadeddata", ready);
  source?.addEventListener?.("error", fail);
  if (owned) {
    source.crossOrigin = "anonymous";
    if (layer.type === "video") {
      source.muted = true;
      source.playsInline = true;
      source.loop = layer.loop !== false;
      source.preload = "auto";
    }
    source.src = layer.source;
  }
  return {
    draw(ctx, frame) {
      if (disposed || failed || !source) return false;
      if (layer.type === "video" && source.readyState < 2) return false;
      if (source.complete === false) return false;
      const source_width =
        source.videoWidth || source.naturalWidth || source.width;
      const source_height =
        source.videoHeight || source.naturalHeight || source.height;
      const portrait =
        layer.type === "image" &&
        source_height > source_width &&
        layer.portrait_pan !== false;
      const reveal = layer.type === "image" && layer.zoom_out;
      const rect = reveal
        ? crt_image_reveal_rect(
            source_width,
            source_height,
            frame.width,
            frame.height,
            layer.zoom_out,
            frame.content_time ?? frame.time ?? 0,
            layer.pan_duration,
            frame.reduced_motion,
          )
        : portrait
          ? crt_portrait_rect(
              source_width,
              source_height,
              frame.width,
              frame.height,
              frame.content_time ?? frame.time ?? 0,
              layer.pan_duration,
              frame.reduced_motion,
            )
          : crt_media_rect(
              source_width,
              source_height,
              frame.width,
              frame.height,
              layer.fit,
            );
      if (!rect) return false;
      try {
        if (!origin_checked) {
          // Reject cross-origin inputs before they can taint the shared texture.
          const probe = canvas_document.createElement("canvas");
          probe.width = probe.height = 1;
          const probe_ctx = probe.getContext("2d", {
            willReadFrequently: true,
          });
          probe_ctx.drawImage(source, 0, 0, 1, 1);
          probe_ctx.getImageData(0, 0, 1, 1);
          origin_checked = true;
        }
        ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height);
        return true;
      } catch (error) {
        fail(error);
        return false;
      }
    },
    set_active(active) {
      if (
        !owned ||
        layer.type !== "video" ||
        disposed ||
        failed ||
        playing === active
      )
        return;
      playing = active;
      if (active)
        source.play().catch((error) => {
          if (
            !disposed &&
            !playback_error_reported &&
            error.name !== "AbortError"
          ) {
            playback_error_reported = true;
            on_error(error, layer);
          }
        });
      else source.pause();
    },
    dispose() {
      disposed = true;
      source?.removeEventListener?.("load", ready);
      source?.removeEventListener?.("loadeddata", ready);
      source?.removeEventListener?.("error", fail);
      if (owned && layer.type === "video") {
        source.pause();
        source.removeAttribute("src");
        source.load();
      } else if (owned) source.removeAttribute("src");
    },
  };
}
