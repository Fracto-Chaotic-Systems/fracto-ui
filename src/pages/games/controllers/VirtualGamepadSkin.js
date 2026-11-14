// Decorate the bundled SVG locally; the vendor asset and its tap targets stay intact.
const SHELL_FINISH = `
  <linearGradient id="fracto-pad-blue-left" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="var(--controller-shell-0, #699fe9)"/>
    <stop offset="0.18" stop-color="var(--controller-shell-1, #316dbb)"/>
    <stop offset="0.46" stop-color="var(--controller-shell-2, #194b8c)"/>
    <stop offset="0.78" stop-color="var(--controller-shell-3, #102d57)"/>
    <stop offset="1" stop-color="var(--controller-shell-4, #07162e)"/>
  </linearGradient>
  <linearGradient id="fracto-pad-blue-right" x1="1" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="var(--controller-shell-0, #699fe9)"/>
    <stop offset="0.18" stop-color="var(--controller-shell-1, #316dbb)"/>
    <stop offset="0.46" stop-color="var(--controller-shell-2, #194b8c)"/>
    <stop offset="0.78" stop-color="var(--controller-shell-3, #102d57)"/>
    <stop offset="1" stop-color="var(--controller-shell-4, #07162e)"/>
  </linearGradient>
  <radialGradient id="fracto-pad-sheen-left" cx="0.28" cy="0.18" r="0.85">
    <stop offset="0" stop-color="var(--controller-highlight, #d3e9ff)" stop-opacity="0.45"/>
    <stop offset="0.4" stop-color="var(--controller-highlight-soft, #7fbaff)" stop-opacity="0.12"/>
    <stop offset="1" stop-color="var(--controller-highlight-soft, #7fbaff)" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="fracto-pad-sheen-right" cx="0.72" cy="0.18" r="0.85">
    <stop offset="0" stop-color="var(--controller-highlight, #d3e9ff)" stop-opacity="0.45"/>
    <stop offset="0.4" stop-color="var(--controller-highlight-soft, #7fbaff)" stop-opacity="0.12"/>
    <stop offset="1" stop-color="var(--controller-highlight-soft, #7fbaff)" stop-opacity="0"/>
  </radialGradient>
`;

export function apply_virtual_gamepad_skin(svg) {
  return svg
    .replace("<defs>", `<defs>${SHELL_FINISH}`)
    .replace(/<path id="gpad_base_(left|right)"[^>]*\/>/g, (path, side) => {
      const highlight = path
        .replace(/id="[^"]*"/, "")
        .replace(
          'class="gpad-base"',
          `class="fracto-shell-highlight" fill="url(#fracto-pad-sheen-${side})"`,
        );
      return path + highlight;
    });
}
