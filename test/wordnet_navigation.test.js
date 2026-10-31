import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {wordnet_selection,
  wordnet_descendants, build_wordnet_tree} from "../src/pages/games/WordnetTree.js";
import {WORLD_CONTENDERS} from "../src/pages/games/WorldsContenders.js";
test("selection chooses one shortest path through shared branches and handles missing IDs",()=>{
 const graph={root:"a",nodes:{a:{children:["b","c"]},b:{children:["d"]},c:{children:["x"]},d:{children:["x"]},x:{children:[]}}};
 assert.deepEqual(wordnet_selection(graph,"x"),{id:"x",key:"a/c/x",expanded:["a","a/c"]});
 assert.deepEqual(wordnet_selection(graph,"missing"),{id:"a",key:"a",expanded:["a"]});
 assert.equal(wordnet_selection(graph,"a").key,"a");
});
test("every theme ID can be selected in a materialized reference tree",async()=>{
 const graph=JSON.parse(await readFile(new URL("../public/wordnet/abstract-nouns.json",import.meta.url),"utf8"));
 for(const theme of WORLD_CONTENDERS){
  const selection=wordnet_selection(graph,theme.id);
  assert.equal(selection.id,theme.id);
  const tree=build_wordnet_tree(graph,selection.expanded);
  const find=nodes=>nodes.some(node=>node.key===selection.key||find(node.children));
  assert.ok(find(tree),theme.id);
 }
});

test("detail descendants stop at three generations and preserve occurrence paths", () => {
 const graph={nodes:Object.fromEntries([
 ["a",["b","x"]],["b",["c"]],["c",["d"]],["d",["e"]],["e",[]],["x",["c"]]
 ].map(([id,children])=>[id,{words:[id],children}]))};
 const branches=wordnet_descendants(graph,"a");
 assert.equal(branches[0].key,"a/b");
 assert.equal(branches[0].children[0].children[0].key,"a/b/c/d");
 assert.deepEqual(branches[0].children[0].children[0].children,[]);
 assert.equal(branches[1].children[0].key,"a/x/c");
 assert.deepEqual(wordnet_descendants(graph,"a/b/c/d/e"),[]);
 graph.nodes.d.children.push("b");
 assert.equal(wordnet_descendants(graph,"a/b/c/d").length,1);
});
