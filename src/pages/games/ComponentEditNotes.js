/**
 * Short labels for meaningful editor edits. They follow the undo history one
 * label per snapshot, so undone edits drop out, and the labels since the last
 * saved version go with the next save into the component's history entry.
 */
const counted = (n, what) => `${n} × ${what}`;

/** One label for a batch of construction-tool commands. */
export function construction_note(commands) {
  const placed = new Map(),
    parts = [];
  let transformed = 0,
    removed = 0;
  const add = (id, n) => placed.set(id, (placed.get(id) ?? 0) + n);
  for (const command of commands ?? []) {
    if (command.type === "place") add(command.object.asset.id, 1);
    else if (command.type === "place-pattern")
      add(command.asset.id, command.instances.length);
    else if (command.type === "transform") transformed += 1;
    else if (command.type === "remove") removed += 1;
    else if (command.type === "scatter")
      parts.push(
        `scattered ${counted(command.rule.count, command.rule.asset.id)}`,
      );
    else if (command.type === "set-floor")
      parts.push(
        command.floor?.asset
          ? `set the floor to ${command.floor.asset.id} (${command.floor.size[0]} × ${command.floor.size[1]} m)`
          : "set the floor",
      );
  }
  const notes = [...placed].map(([id, n]) => `placed ${counted(n, id)}`);
  if (transformed)
    notes.push(`adjusted ${transformed} object${transformed === 1 ? "" : "s"}`);
  if (removed) notes.push(`removed ${removed} item${removed === 1 ? "" : "s"}`);
  return [...notes, ...parts].join(", ") || null;
}

/** Label for an applied AI construction proposal. */
export const proposal_note = (plan) => {
  const summary = String(plan?.summary ?? "").trim();
  return summary
    ? `applied proposal "${summary.length > 120 ? `${summary.slice(0, 119)}…` : summary}"`
    : "applied a construction proposal";
};

/** Empty label history for a freshly opened document. */
export const create_note_history = () => ({
  past: [],
  present: null,
  future: [],
});

/** Mirrors an edit: `next` is the SDK history after the edit. */
export function note_edit(notes, history, next, label) {
  if (next === history) return notes;
  return {
    past: [...notes.past, notes.present].slice(-next.past.length || undefined),
    present: label ?? null,
    future: [],
  };
}
export const note_undo = (notes) =>
  notes.past.length
    ? {
        past: notes.past.slice(0, -1),
        present: notes.past.at(-1),
        future: [notes.present, ...notes.future],
      }
    : notes;
export const note_redo = (notes) =>
  notes.future.length
    ? {
        past: [...notes.past, notes.present],
        present: notes.future[0],
        future: notes.future.slice(1),
      }
    : notes;

/**
 * Labels of the edits between the last saved version and the present one,
 * in order, with repeats collapsed ("(×3)"). Empty when the present version
 * is the saved one or the saved version is no longer in the undo lineage.
 */
export function notes_since_save(state) {
  const { history, notes, saved_ref, revision } = state;
  if (!history || !notes) return [];
  let labels;
  // A never-saved component: every edit since it was created.
  if (!revision) labels = [...notes.past, notes.present];
  else if (!saved_ref || history.present === saved_ref) return [];
  else {
    const index = history.past.lastIndexOf(saved_ref);
    if (index < 0) return [];
    labels = [...notes.past.slice(index + 1), notes.present];
  }
  const counts = new Map();
  for (const label of labels.filter(Boolean))
    counts.set(label, (counts.get(label) ?? 0) + 1);
  return [...counts]
    .map(([label, n]) => (n > 1 ? `${label} (×${n})` : label))
    .slice(0, 20)
    .map((label) => label.slice(0, 200));
}
