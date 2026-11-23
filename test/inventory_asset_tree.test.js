import assert from "node:assert/strict";
import test from "node:test";
import { build_inventory_asset_tree } from "../src/pages/games/InventoryAssetTree.js";

test("existing root assets remain selectable leaves with stable identities", () => {
  const assets = ["grass-patch-001", "grasses-2", "grasses3"].map((id) => ({
    id,
    name: id,
  }));
  const tree = build_inventory_asset_tree(assets);
  assert.equal(tree.nodes.length, 3);
  assert.deepEqual(tree.folder_keys, []);
  assert.ok(tree.nodes.every((node) => node.isLeaf));
  assert.deepEqual(
    new Set(tree.nodes.map((node) => node.metadata.asset_id)),
    new Set(assets.map((asset) => asset.id)),
  );
});

test("nested folders are shared, ordered before leaves and independent of display-name collisions", () => {
  const assets = [
    { id: "grass-two", name: "Grass", folder_path: "Vegetation/Grasses" },
    { id: "grass-one", name: "Grass", folder_path: "Vegetation/Grasses" },
    { id: "tree", name: "Oak", folder_path: "Vegetation/Trees" },
    { id: "root", name: "Vegetation", folder_path: "" },
  ];
  const tree = build_inventory_asset_tree(assets);
  assert.equal(tree.nodes[0].key, "folder:Vegetation");
  assert.equal(tree.nodes[1].key, "asset:root");
  const folders = tree.nodes[0].children;
  assert.deepEqual(
    folders.map((folder) => folder.title),
    ["Grasses", "Trees"],
  );
  assert.deepEqual(
    folders[0].children.map((leaf) => leaf.key),
    ["asset:grass-one", "asset:grass-two"],
  );
  assert.deepEqual(
    build_inventory_asset_tree([...assets].reverse()).nodes,
    tree.nodes,
  );
});

test("folder moves regroup one asset while keeping its preview ID", () => {
  const before = {
    id: "grass",
    name: "Grass",
    folder_path: "Vegetation/Grasses",
  };
  const after = { ...before, folder_path: "Props" };
  assert.equal(
    build_inventory_asset_tree([before]).nodes[0].children[0].children[0].key,
    "asset:grass",
  );
  assert.equal(
    build_inventory_asset_tree([after]).nodes[0].children[0].key,
    "asset:grass",
  );
  assert.deepEqual(build_inventory_asset_tree([]), {
    nodes: [],
    folder_keys: [],
  });
});

test("saved empty folders and intermediate parents survive without assets", () => {
 const tree = build_inventory_asset_tree([], ["Vegetation/Grasses", "Buildings", "Vegetation/Grasses"]);
 assert.equal(tree.nodes.length, 2);
 assert.deepEqual(tree.nodes.map(node=>node.title), ["Buildings", "Vegetation"]);
 assert.deepEqual(tree.nodes[1].children[0].children, []);
 assert.equal(tree.folder_keys.length, 3);
 const moved = build_inventory_asset_tree([{id:"grass",name:"Grass",folder_path:"Buildings"}], ["Vegetation/Grasses", "Buildings"]);
 assert.equal(moved.nodes[0].children[0].metadata.asset_id, "grass");
 assert.deepEqual(moved.nodes[1].children[0].children, []);
});

test("one folder containing all grasses stays visible above its leaves", async () => {
 const {build_tree_items}=await import("../src/utils/ui/CoolTreeItems.js");
 const assets=["grass-patch-001","grasses-2","grasses3"].map(id=>({id,name:id,folder_path:"plants"}));
 const tree=build_inventory_asset_tree(assets,["plants"]);
 const built=build_tree_items(tree.nodes,false,false,"building...",0,undefined,0,false);
 const visible=built.items[built.root_item].children;
 assert.deepEqual(visible,["folder:plants"]);
 assert.equal(built.items[visible[0]].data.title,"plants");
 assert.equal(built.items[visible[0]].children.length,3);
 const single=build_tree_items(build_inventory_asset_tree([assets[0]]).nodes,false,false,"building...",0,undefined,0,false);
 assert.deepEqual(single.items[single.root_item].children,["folder:plants"]);
 const legacy=build_tree_items(tree.nodes,false);
 assert.equal(legacy.root_item,"folder:plants");
 const only_asset=build_tree_items(build_inventory_asset_tree([{id:"grass",name:"Grass"}]).nodes,false,false,"building...",0,undefined,0,false);
 assert.deepEqual(only_asset.items[only_asset.root_item].children,["asset:grass"]);
});
