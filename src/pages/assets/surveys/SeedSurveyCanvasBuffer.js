import FractoCanvasBuffer from "@fracto/sdk/FractoCanvasBuffer.js";

const BYTES_PER_SAMPLE = 13;

export const canvas_buffer_cache = (cache_key, size_px) => {
  const source_canvas = document.createElement("canvas");
  source_canvas.width = size_px;
  source_canvas.height = size_px;
  return {
    cache_key,
    canvas_buffer: Array.from({ length: size_px }, () =>
      Array(size_px).fill(null),
    ),
    source_canvas,
  };
};

export const paint_canvas_buffer = (
  cache,
  context,
  source_size_px,
  display_size_px,
) => {
  const source_context = cache.source_canvas.getContext("2d");
  if (!source_context) return;
  source_context.fillStyle = "#eeeeee";
  source_context.fillRect(0, 0, source_size_px, source_size_px);
  FractoCanvasBuffer.buffer_to_canvas(cache.canvas_buffer, source_context);
  context.clearRect(0, 0, display_size_px, display_size_px);
  context.drawImage(
    cache.source_canvas,
    0,
    0,
    display_size_px,
    display_size_px,
  );
};

// Buffers are column-major; packed input is row-major with absolute row offsets.
export const store_packed_rows = (cache, batch, size_px) => {
  const batch_bytes = Uint8Array.from(atob(batch.data), (character) =>
    character.charCodeAt(0),
  );
  const view = new DataView(batch_bytes.buffer);
  for (let row_offset = 0; row_offset < batch.row_count; row_offset++) {
    const row_index = batch.row_start + row_offset;
    for (let column = 0; column < size_px; column++) {
      const offset = (row_offset * size_px + column) * BYTES_PER_SAMPLE;
      if (view.getUint8(offset) === 0) continue;
      cache.canvas_buffer[column][row_index] = [
        view.getUint32(offset + 1, true),
        view.getUint32(offset + 9, true),
      ];
    }
  }
};

export const store_canvas_rows = (cache, canvas_buffer, row_batch) => {
  if (Array.isArray(canvas_buffer)) {
    cache.canvas_buffer = canvas_buffer;
  } else if (row_batch?.rows?.length) {
    row_batch.rows.forEach(({ row_index, values }) => {
      values.forEach((point_data, canvas_x) => {
        cache.canvas_buffer[canvas_x][row_index] = point_data;
      });
    });
  }
};
