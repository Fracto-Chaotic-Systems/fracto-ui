export const MAX_HISTORY_LENGTH = 100;

const freeze_snapshot = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.values(value).forEach(freeze_snapshot);
  return Object.freeze(value);
};

/** Creates an immutable copy of a video record. */
export const clone_video = (video) => {
  if (!video) {
    return null;
  }
  return freeze_snapshot(JSON.parse(JSON.stringify(video)));
};

/** Compares two complete video snapshots by value. */
export const snapshots_equal = (first, second) =>
  JSON.stringify(first) === JSON.stringify(second);

/** Appends an edit, truncating redo states and enforcing the history limit. */
export const append_snapshot = (
  history,
  position,
  video,
  max_length = MAX_HISTORY_LENGTH,
) => {
  const snapshot = clone_video(video);
  if (!snapshot || snapshots_equal(history[position], snapshot)) {
    return { history, position, changed: false };
  }
  const branch = history.slice(0, position + 1);
  const next_history = [...branch, snapshot].slice(-max_length);
  return {
    history: next_history,
    position: next_history.length - 1,
    changed: true,
  };
};

/** Moves a history cursor by one step while clamping it to valid bounds. */
export const move_position = (history, position, direction) => {
  const next_position = Math.max(
    0,
    Math.min(history.length - 1, position + direction),
  );
  return history.length && next_position !== position ? next_position : position;
};
