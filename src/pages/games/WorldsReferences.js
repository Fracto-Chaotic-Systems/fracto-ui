// Decorate parsed prose only: source Markdown, code and existing links stay intact.
export function world_references({ cards = [], themes = {} } = {}) {
  const available = new Set(cards.map(Number));
  return (tree) => {
    const walk = (parent) => {
      if (
        !parent.children ||
        ["link", "linkReference", "code", "inlineCode"].includes(parent.type)
      )
        return;
      parent.children = parent.children.flatMap((node) => {
        if (node.type !== "text") {
          walk(node);
          return [node];
        }
        const parts = [];
        const pattern = /#(\d+)\b|\bworld\s+#?(\d+)\b/gi;
        let start = 0;
        for (const match of node.value.matchAll(pattern)) {
          const card = Number(match[1] ?? match[2]);
          if (!available.has(card)) continue;
          let label = match[0];
          const theme = themes[card];
          const remainder = node.value.slice(match.index + label.length);
          const spacing = /^[ \t]+/.exec(remainder)?.[0] ?? "";
          if (theme && spacing) {
            const candidate = remainder.slice(
              spacing.length,
              spacing.length + theme.length,
            );
            const next = remainder[spacing.length + theme.length] ?? "";
            if (
              candidate.toLowerCase() === theme.toLowerCase() &&
              !/[\p{L}\p{N}_]/u.test(next)
            ) {
              label += spacing + candidate;
            }
          }
          if (match.index > start)
            parts.push({
              type: "text",
              value: node.value.slice(start, match.index),
            });
          parts.push({
            type: "link",
            url: `#world-row-${card}`,
            children: [{ type: "text", value: label }],
          });
          start = match.index + label.length;
        }
        if (!start) return [node];
        if (start < node.value.length)
          parts.push({ type: "text", value: node.value.slice(start) });
        return parts;
      });
    };
    walk(tree);
  };
}
