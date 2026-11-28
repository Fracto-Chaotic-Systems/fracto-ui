import {
  component_lighting,
  DEFAULT_COMPONENT_AMBIENT,
} from "@fracto/sdk/FractoComponentDocument.js";

// Same azimuth/elevation convention as the materials viewer. Changing lighting
// never rebuilds geometry, reloads assets or resets an animation clock.
// The optional ambient light is the stage's sky (hemisphere) light.
export function update_component_lighting(light, document, ambient_light) {
  const { direction_degrees, intensity, ambient } = component_lighting(document);
  const angle = (direction_degrees * Math.PI) / 180;
  light.position.set(Math.cos(angle) * 4, 3, Math.sin(angle) * 4);
  light.intensity = intensity;
  if (ambient_light)
    ambient_light.intensity = ambient ?? DEFAULT_COMPONENT_AMBIENT;
}
