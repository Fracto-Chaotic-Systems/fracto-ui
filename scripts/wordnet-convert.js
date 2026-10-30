import process from "node:process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";

export function parse_nouns(text) {
  const nodes = {};
  for (const line of text.split(/\r?\n/)) {
    if (!/^\d{8} /.test(line)) continue;
    const divider = line.indexOf("|");
    if (divider < 0) throw new Error("Missing noun gloss");
    const fields = line.slice(0, divider).trim().split(/\s+/);
    const [id, lex_file, pos, count] = fields;
    if (pos !== "n") throw new Error(`Unexpected part of speech: ${id}`);
    let cursor = 4;
    const words = [];
    for (let i = 0; i < parseInt(count, 16); i++) {
      words.push(fields[cursor]);
      cursor += 2;
    }
    const pointer_count = Number(fields[cursor++]);
    const children = [];
    const parents = [];
    for (let i = 0; i < pointer_count; i++) {
      const [symbol, target, target_pos, source_target] = fields.slice(
        cursor,
        cursor + 4,
      );
      cursor += 4;
      if (target_pos !== "n" || source_target !== "0000") continue;
      if (symbol === "~" || symbol === "~i") children.push(target);
      if (symbol === "@" || symbol === "@i") parents.push(target);
    }
    if (cursor !== fields.length || words.some((word) => !word))
      throw new Error(`Malformed noun record: ${id}`);
    if (nodes[id]) throw new Error(`Duplicate synset: ${id}`);
    nodes[id] = {
      id,
      lex_file,
      words,
      gloss: line.slice(divider + 1).trim(),
      children,
      parents,
    };
  }
  return nodes;
}

export function abstract_graph(nodes) {
  const roots = Object.values(nodes).filter(
    (node) =>
      node.words.includes("abstraction") &&
      node.words.includes("abstract_entity"),
  );
  if (roots.length !== 1)
    throw new Error("Expected one abstraction / abstract_entity root");
  const root = roots[0].id;
  const selected = {};
  const active = new Set();
  const visit = (id) => {
    if (active.has(id)) throw new Error(`Taxonomy cycle at ${id}`);
    if (selected[id]) return;
    const node = nodes[id];
    if (!node) throw new Error(`Missing referenced synset: ${id}`);
    active.add(id);
    for (const child of node.children) visit(child);
    active.delete(id);
    selected[id] = node;
  };
  visit(root);
  return {
    schema_version: 1,
    source: "Princeton WordNet 3.1",
    root,
    node_count: Object.keys(selected).length,
    nodes: selected,
  };
}

export async function convert(input, output) {
  const text = await readFile(resolve(input, "data.noun"), "utf8");
  const graph = abstract_graph(parse_nouns(text));
  graph.license = text
    .split(/\r?\n/)
    .filter((line) => /^ /.test(line))
    .join("\n");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(graph) + "\n");
  await writeFile(
    resolve(dirname(output), "LICENSE.txt"),
    graph.license + "\n",
  );
  console.log(
    `Converted ${graph.node_count} synsets; root ${graph.root}; ${output}`,
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [, , input, output] = process.argv;
  if (!input || !output)
    throw new Error(
      "Usage: node scripts/wordnet-convert.js <dict-directory> <output-json>",
    );
  await convert(input, resolve(output));
}
