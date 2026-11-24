import { component_lighting } from "@fracto/sdk/FractoComponentDocument.js";

// Same azimuth/elevation convention as the materials viewer. Changing lighting
// never rebuilds geometry, reloads assets or resets an animation clock.
export function update_component_lighting(light, document) {
  const { direction_degrees, intensity } = component_lighting(document);
  const angle = (direction_degrees * Math.PI) / 180;
  light.position.set(Math.cos(angle) * 4, 3, Math.sin(angle) * 4);
  light.intensity = intensity;
}
