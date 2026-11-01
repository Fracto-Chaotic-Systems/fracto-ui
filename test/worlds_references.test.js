import assert from "node:assert/strict";
import test from "node:test";
import { world_references } from "../src/pages/games/WorldsReferences.js";
test("world references decorate only valid prose targets without editing source", () => {
  const source = "#68 vs world 51, World #48 and #999";
  const tree = {
    type: "root",
    children: [
      {
        type: "paragraph",
        children: [
          { type: "text", value: source },
          { type: "inlineCode", value: "#68" },
          {
            type: "link",
            url: "https://example.org",
            children: [{ type: "text", value: "#68" }],
          },
        ],
      },
    ],
  };
  world_references({ cards: [68, 51, 48] })(tree);
  const children = tree.children[0].children;
  assert.deepEqual(
    children.filter((n) => n.type === "link").map((n) => n.url),
    ["#world-row-68", "#world-row-51", "#world-row-48", "https://example.org"],
  );
  assert.equal(
    children
      .filter((n) => n.type === "text" || n.type === "link")
      .slice(0, -1)
      .map((n) => n.value ?? n.children[0].value)
      .join(""),
    source,
  );
  assert.equal(children.find((n) => n.type === "inlineCode").value, "#68");
  assert.equal(children.at(-1).children[0].type, "text");
  const once = JSON.stringify(tree);
  world_references({ cards: [68, 51, 48] })(tree);
  assert.equal(JSON.stringify(tree), once);
});

test("world reference links include matching theme labels without swallowing prose", () => {
  const source =
    "#17 space, #17 SPACE; world 17 space. #17 spaceship; #17 concerns space; #68 orientation.";
  const tree = { type: "root", children: [{ type: "text", value: source }] };
  world_references({
    cards: [17, 68],
    themes: { 17: "space", 68: "orientation" },
  })(tree);
  assert.deepEqual(
    tree.children
      .filter((n) => n.type === "link")
      .map((n) => n.children[0].value),
    [
      "#17 space",
      "#17 SPACE",
      "world 17 space",
      "#17",
      "#17",
      "#68 orientation",
    ],
  );
  assert.equal(
    tree.children.map((n) => n.value ?? n.children[0].value).join(""),
    source,
  );
});
