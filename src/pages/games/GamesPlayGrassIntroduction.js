// Presentation roles for the game's explicitly pinned grass-strip release.
export const GRASS_FULL_VISIBILITY_SECONDS = [4, 10.25, 17.5, 23.5, 26.5];
const durations = [0, 1.5, 4, 3, 3];
export const GRASS_INTRODUCTION = {
  durations,
  cue_seconds: GRASS_FULL_VISIBILITY_SECONDS.map(
    (seconds, rank) => seconds - durations[rank],
  ),
  limit: -1,
};
export function grass_introduction_rank(document) {
  if (document.floor) return 2;
  const id = document.objects[0]?.asset.id ?? "";
  if (id.startsWith("ladybug")) return 0;
  if (id.startsWith("rocks-piece-")) return 1;
  if (id.startsWith("animated-grass")) return 3;
  return 4; // Dense yard grass follows the small sparse tufts.
}
