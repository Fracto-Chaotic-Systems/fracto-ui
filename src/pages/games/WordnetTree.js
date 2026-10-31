// Path keys distinguish occurrences of synsets with multiple parents.
export function build_wordnet_tree(graph, expanded_keys) {
  const expanded = new Set(expanded_keys);
  const visit = (id, path, ancestors) => {
    if (ancestors.has(id)) throw new Error(`Taxonomy cycle at ${id}`);
    const node = graph.nodes[id];
    if (!node) throw new Error(`Unknown synset: ${id}`);
    const next = new Set([...ancestors, id]);
    return {
      key: path,
      title: node.words.map((word) => word.replaceAll("_", " ")).join(", "),
      isLeaf: node.children.length === 0,
      metadata: { synset_id: id },
      children: expanded.has(path)
        ? node.children.map((child) => visit(child, `${path}/${child}`, next))
        : [],
    };
  };
  return [visit(graph.root, graph.root, new Set())];
}

// Breadth-first traversal picks one shortest root path through multiple inheritance.
export function wordnet_selection(graph, requested_id) {
  const parents = new Map([[graph.root, null]]);
  const queue = [graph.root];
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index];
    if (id === requested_id) break;
    for (const child of graph.nodes[id]?.children || []) {
      if (!parents.has(child)) {
        parents.set(child, id);
        queue.push(child);
      }
    }
  }
  const id = parents.has(requested_id) ? requested_id : graph.root;
  const path = [];
  for (let current = id; current !== null; current = parents.get(current))
    path.unshift(current);
  const keys = path.map((_, index) => path.slice(0, index + 1).join("/"));
  return {
    id,
    key: keys.at(-1),
    expanded: keys.slice(0, -1).length ? keys.slice(0, -1) : [graph.root],
  };
}

// Preserve occurrence paths so shared descendants keep the selected ancestry.
export function wordnet_descendants(graph, selected_path, generations = 3) {
  const visit = (path, remaining, ancestors) => {
    const id = path.split("/").at(-1);
    if (remaining === 0) return [];
    return graph.nodes[id].children
      .filter((child) => !ancestors.has(child))
      .map((child) => {
        const key = `${path}/${child}`;
        return {
          key,
          id: child,
          title: graph.nodes[child].words
            .map((word) => word.replaceAll("_", " "))
            .join(", "),
          children: visit(key, remaining - 1, new Set([...ancestors, child])),
        };
      });
  };
  return visit(selected_path, generations, new Set(selected_path.split("/")));
}
