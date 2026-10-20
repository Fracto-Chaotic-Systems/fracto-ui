import { find_dynamic_rays } from "@fracto/sdk/orbitals/FractoDynamicRays.js";

// Numerical basis and limits: see RAYS.md (Milnor 2000; Benini–Lyubich 2014).
self.onmessage = async ({ data }) => {
  const { id, focal_point, orbital } = data;
  try {
    const result = await find_dynamic_rays(focal_point, orbital, {
      on_progress: (progress) => self.postMessage({ id, progress }),
    });
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: String(error?.message || error) });
  }
};
