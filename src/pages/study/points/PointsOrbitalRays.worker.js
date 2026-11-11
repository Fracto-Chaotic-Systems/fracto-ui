import { trace_known_dynamic_rays } from "@fracto/sdk/orbitals/FractoKnownDynamicRays.js";

self.onmessage = async ({ data: { id, request } }) => {
  try {
    const sent = new Set();
    const fresh = (rays) =>
      rays.filter((ray) => {
        if (sent.has(ray.angle.key)) return false;
        sent.add(ray.angle.key);
        return true;
      });
    const result = await trace_known_dynamic_rays(request, {
      on_progress: (progress) =>
        self.postMessage({
          id,
          progress: { ...progress, rays: fresh(progress.rays) },
        }),
    });
    // Geometry has already streamed in complete validated families. Avoid a
    // second structured clone of a potentially very large final result.
    self.postMessage({ id, result: { ...result, rays: fresh(result.rays) } });
  } catch (error) {
    self.postMessage({ id, error: String(error?.message || error) });
  }
};
