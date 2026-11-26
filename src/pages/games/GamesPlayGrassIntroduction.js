// Presentation roles for the game's explicitly pinned grass-strip release.
export const GRASS_INTRODUCTION = {
  durations: [0, 1.5, 4, 4],
  holds: [0, 4, 0, 0],
  limit: -1,
};
export function grass_introduction_rank(document) {
  if (document.floor) return 2;
  const id = document.objects[0]?.asset.id ?? "";
  if (id.startsWith("ladybug")) return 0;
  if (id.startsWith("rocks-piece-")) return 1;
  return 3; // Both sparse and dense grass share the final reveal.
}
