export const CONTROLLER_COLORS = [
  "green",
  "red",
  "orange",
  "white",
  "violet",
  "blue",
  "pink",
  "yellow",
  "black",
  "grey",
];

// Five shell stops plus the reflected highlight color, lightest to darkest.
const PALETTES = {
  green: ["#82cba1", "#3c966a", "#236949", "#123f30", "#08251c", "#dcffeb"],
  red: ["#ef8c8c", "#c64949", "#94292f", "#5a1823", "#2e0b14", "#ffe4e4"],
  orange: ["#ffc17a", "#e88932", "#b55b1c", "#713713", "#39200e", "#fff0db"],
  white: ["#ffffff", "#e8edf4", "#c8d1df", "#9daabd", "#637287", "#ffffff"],
  violet: ["#b59aef", "#865cc7", "#603b96", "#39245f", "#1c1233", "#f0e5ff"],
  blue: ["#699fe9", "#316dbb", "#194b8c", "#102d57", "#07162e", "#d3e9ff"],
  pink: ["#f4a6d0", "#d868a6", "#aa407c", "#6d2752", "#38152d", "#ffe8f5"],
  yellow: ["#fff4a1", "#edcf4c", "#bd9a23", "#796014", "#3f320d", "#fffce4"],
  black: ["#596575", "#303b4a", "#1c2633", "#0c131e", "#03070d", "#b7c7dc"],
  grey: ["#c2c8d1", "#929ca9", "#677381", "#3e4958", "#202a36", "#edf2f8"],
};

export const normalize_controller_color = (color) =>
  CONTROLLER_COLORS.includes(color) ? color : "blue";

export function controller_color_style(color) {
  const palette = PALETTES[normalize_controller_color(color)];
  return {
    ...Object.fromEntries(
      palette
        .slice(0, 5)
        .map((value, index) => [`--controller-shell-${index}`, value]),
    ),
    "--controller-highlight": palette[5],
    "--controller-highlight-soft": palette[0],
    "--controller-rim": palette[0],
    "--controller-shadow": `${palette[4]}66`,
  };
}
