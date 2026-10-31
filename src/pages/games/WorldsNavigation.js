// Scroll only the mapping viewport, leaving the surrounding page in place.
export function scroll_world_row(viewport, cardinality) {
  const value = Number(cardinality);
  if (!Number.isSafeInteger(value) || value < 1) return;
  const row = viewport?.querySelector(`[data-cardinality="${value}"]`);
  if (!row) return;
  const header_height =
    viewport.querySelector("thead")?.getBoundingClientRect().height || 0;
  const offset =
    row.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
  viewport.scrollTo({
    top: viewport.scrollTop + offset - header_height - 1,
    behavior: "smooth",
  });
}

// The theme list has its own viewport and no sticky header.
export function scroll_world_theme(viewport, synset_id) {
  if (!/^\d{8}$/.test(synset_id)) return;
  const item = viewport?.querySelector(`[data-synset-id="${synset_id}"]`);
  if (!item) return;
  viewport.scrollTo({
    top:
      viewport.scrollTop +
      item.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top,
    behavior: "smooth",
  });
}
