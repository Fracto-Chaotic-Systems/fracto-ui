import {
  create_crt_interference,
  create_crt_noise,
  draw_crt_face,
  draw_crt_glass,
} from "./CrtScreenEffects.js";
import { prepare_crt_media } from "./CrtScreenMedia.js";
import { create_crt_playlist } from "./CrtScreenPlaylist.js";
import { create_crt_broadcast } from "./CrtBroadcast.js";

const DEFAULT_CONTENT = { layers: [{ type: "face" }], interference: true };

// Every source is composited into the same UV-mapped glass texture. No source
// needs its own DOM positioning, perspective transform, or animation renderer.
export function create_crt_screen(
  canvas,
  {
    random,
    on_ready = () => {},
    on_error = () => {},
    broadcast,
    canvas_factory = () => canvas.ownerDocument.createElement("canvas"),
  } = {},
) {
  const ctx = canvas.getContext("2d");
  const noise = create_crt_noise(canvas_factory);
  const interference = create_crt_interference({ random });
  const draw_broadcast = broadcast ? create_crt_broadcast(broadcast) : null;
  let content,
    requested,
    playlist,
    layers = [],
    active = true,
    disposed = false,
    elapsed = 0,
    content_time = 0;
  const apply_content = (next) => {
    layers.forEach((entry) => entry.media?.dispose());
    content = next;
    content_time = 0;
    layers = (Array.isArray(content.layers) ? content.layers : []).map(
      (layer) => {
        const entry = { layer, failed: false };
        if (layer.type === "image" || layer.type === "video") {
          entry.media = prepare_crt_media(layer, {
            canvas_document: canvas.ownerDocument,
            on_ready,
            on_error,
          });
          entry.media.set_active(active);
        }
        return entry;
      },
    );
  };
  const set_content = (next) => {
    next = next ?? DEFAULT_CONTENT;
    if (disposed || next === requested) return;
    requested = next;
    playlist = Array.isArray(next.playlist)
      ? create_crt_playlist(next.playlist, { random })
      : null;
    interference.reset();
    apply_content(playlist ? playlist.content : next);
  };
  const set_active = (next) => {
    active = !!next;
    layers.forEach((entry) => entry.media?.set_active(active));
  };
  set_content();
  return {
    set_content,
    set_active,
    get source() {
      return layers.length === 1 ? layers[0].layer.source || "" : "";
    },
    paint({ dt = 0, pointer = { x: 0, y: 0 }, reduced_motion = false } = {}) {
      if (disposed) return "disposed";
      const selected = playlist?.advance(dt, !reduced_motion);
      if (selected && selected !== content) apply_content(selected);
      elapsed += Math.max(0, Math.min(0.1, Number(dt) || 0));
      content_time += Math.max(0, Math.min(0.1, Number(dt) || 0));
      const frame = {
        time: elapsed,
        content_time,
        dt,
        pointer,
        reduced_motion,
        width: canvas.width,
        height: canvas.height,
      };
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = content.background || "#03120f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const interrupted = interference.advance(
        dt,
        !!content.interference && !reduced_motion,
      );
      let drawn = false;
      if (interrupted) {
        noise(ctx, frame);
        drawn = true;
      } else
        for (const entry of layers) {
          const { layer, media } = entry;
          if (entry.failed) continue;
          ctx.save();
          try {
            ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity ?? 1));
            ctx.globalCompositeOperation = layer.blend || "source-over";
            const rect = layer.rect || { x: 0, y: 0, width: 1, height: 1 };
            ctx.translate(
              (rect.x || 0) * frame.width,
              (rect.y || 0) * frame.height,
            );
            const layer_frame = {
              ...frame,
              width: frame.width * (rect.width ?? 1),
              height: frame.height * (rect.height ?? 1),
            };
            ctx.beginPath();
            ctx.rect(0, 0, layer_frame.width, layer_frame.height);
            ctx.clip();
            if (media) drawn = media.draw(ctx, layer_frame) || drawn;
            else if (layer.type === "face") {
              draw_crt_face(ctx, layer_frame);
              drawn = true;
            } else if (layer.type === "static") {
              noise(ctx, layer_frame);
              drawn = true;
            } else if (
              layer.type === "animation" &&
              typeof layer.draw === "function"
            ) {
              layer.draw(ctx, layer_frame);
              drawn = true;
            }
          } catch (error) {
            entry.failed = true;
            on_error(error, layer);
          } finally {
            ctx.restore();
          }
        }
      if (!drawn) draw_crt_face(ctx, frame);
      draw_broadcast?.(ctx, frame);
      draw_crt_glass(ctx, frame.width, frame.height);
      return interrupted ||
        (layers.length === 1 && layers[0].layer.type === "static")
        ? "static"
        : layers.length === 1 && layers[0].layer.type === "face"
          ? "face"
          : layers.length === 1 && layers[0].media
            ? layers[0].layer.type
            : "content";
    },
    dispose() {
      disposed = true;
      layers.forEach((entry) => entry.media?.dispose());
      layers = [];
    },
  };
}
