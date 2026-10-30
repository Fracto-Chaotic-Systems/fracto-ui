import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parse_nouns, abstract_graph } from "../scripts/wordnet-convert.js";
import { build_wordnet_tree } from "../src/pages/games/WordnetTree.js";

const node = (id, children = [], words = [id]) => ({
  id,
  words,
  children,
  parents: [],
  gloss: id,
});
const fixture = () => ({
  a: node("a", ["b", "c"], ["abstraction", "abstract_entity"]),
  b: node("b", ["d"]),
  c: node("c", ["d"]),
  d: node("d"),
});
test("parser handles hexadecimal word counts, pointers, and gloss separators", () => {
  const words = Array.from({ length: 10 }, (_, i) => `word_${i} 0`).join(" ");
  const text = `  license\n00000001 03 n 0a ${words} 003 ~ 00000002 n 0000 ~i 00000003 n 0000 + 00000004 v 0101 | definition | example`;
  const record = parse_nouns(text)["00000001"];
  assert.equal(record.words.length, 10);
  assert.deepEqual(record.children, ["00000002", "00000003"]);
  assert.equal(record.gloss, "definition | example");
});
test("extraction preserves shared children without duplicating canonical records", () => {
  const graph = abstract_graph(fixture());
  assert.equal(graph.node_count, 4);
  assert.deepEqual(graph.nodes.b.children, ["d"]);
  assert.deepEqual(graph.nodes.c.children, ["d"]);
});
test("extraction rejects missing descendants, cycles and ambiguous roots", () => {
  const missing = fixture();
  delete missing.d;
  assert.throws(() => abstract_graph(missing), /Missing/);
  const cyclic = fixture();
  cyclic.d.children = ["a"];
  assert.throws(() => abstract_graph(cyclic), /cycle/);
  const ambiguous = fixture();
  ambiguous.b.words = ambiguous.a.words;
  assert.throws(() => abstract_graph(ambiguous), /one abstraction/);
});
test("tree materializes expanded branches with distinct occurrence keys", () => {
  const graph = abstract_graph(fixture());
  const collapsed = build_wordnet_tree(graph, []);
  assert.equal(collapsed[0].isLeaf, false);
  assert.deepEqual(collapsed[0].children, []);
  const tree = build_wordnet_tree(graph, ["a", "a/b", "a/c"])[0];
  assert.equal(tree.children[0].children[0].key, "a/b/d");
  assert.equal(tree.children[1].children[0].key, "a/c/d");
  assert.equal(tree.children[0].children[0].metadata.synset_id, "d");
});
test("generated real graph has a license, valid descendants, and the expected root", async () => {
  const graph = JSON.parse(
    await readFile(
      new URL("../public/wordnet/abstract-nouns.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(graph.root, "00002137");
  assert.equal(graph.schema_version, 1);
  assert.ok(graph.license.includes("WordNet 3.1 Copyright"));
  assert.equal(graph.node_count, Object.keys(graph.nodes).length);
  assert.ok(graph.node_count > 39000);
  for (const record of Object.values(graph.nodes)) {
    for (const child of record.children) assert.ok(graph.nodes[child], child);
  }
  assert.equal(abstract_graph(graph.nodes).node_count, graph.node_count);
});
