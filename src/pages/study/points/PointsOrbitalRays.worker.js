import { trace_known_dynamic_rays } from "@fracto/sdk/orbitals/FractoKnownDynamicRays.js";

self.onmessage = async ({ data: { id, request } }) => {
  try {
    const result = await trace_known_dynamic_rays(request, {
      on_progress: (progress) => self.postMessage({ id, progress }),
    });
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: String(error?.message || error) });
  }
};
