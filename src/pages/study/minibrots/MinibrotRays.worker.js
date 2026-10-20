import { find_minibrot_rays } from "@fracto/sdk/orbitals/FractoMinibrotRays.js";
self.onmessage = ({ data }) => {
  try {
    self.postMessage({
      result: find_minibrot_rays(data.core_point, data.period, {
        tolerance: data.tolerance,
        include_thirds: true,
        include_tip: true,
        on_progress: (progress) => self.postMessage({ progress }),
      }),
    });
  } catch {
    self.postMessage({ result: { status: "unresolved", rays: [] } });
  }
};
