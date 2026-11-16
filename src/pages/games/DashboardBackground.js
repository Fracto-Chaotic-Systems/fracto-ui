export const DASHBOARD_BACKGROUNDS = ["woodgrain", "metal", "wicker", "pearl"];

export const normalize_dashboard_background = (value) =>
  DASHBOARD_BACKGROUNDS.includes(value) ? value : "woodgrain";

// Locally bundled CC0 color maps; keep image scale independent of panel dimensions.
// Each finish uses the same padding-box surface and polished border-box rim.
const SURFACES = {
  woodgrain:
    'url("/dashboard/woodgrain.webp") 0 0 / 768px 768px repeat padding-box',
  metal: 'url("/dashboard/metal.webp") 0 0 / 512px 512px repeat padding-box',
  wicker: 'url("/dashboard/wicker.webp") 0 0 / 256px 256px repeat padding-box',
  pearl:
    'url("/dashboard/pearl.webp") center / auto max(1100px, 200%) no-repeat padding-box',
};

export function dashboard_background(value, night = false) {
  const finish = normalize_dashboard_background(value);
  const shine =
    finish === "metal"
      ? `linear-gradient(110deg, #ffffff00 38%, #ffffff12 45%, ${night ? "#ffffff38" : "#ffffff99"} 50%, #ffffff12 55%, #ffffff00 62%) 50% 0 / 240% 100% no-repeat padding-box,`
      : "";
  return `${shine}linear-gradient(110deg, #ffffff14, #00000033) padding-box,
    ${SURFACES[finish]},
    linear-gradient(135deg, #faf5de 0%, #a7997a 12%, #fffdf2 25%, #706957 43%, #ded8bd 58%, #fffdf2 72%, #6b6251 88%, #d9ceb1 100%) border-box`;
}
