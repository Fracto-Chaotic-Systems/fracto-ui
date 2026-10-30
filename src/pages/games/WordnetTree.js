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
