import assert from "node:assert/strict";
import test from "node:test";

import {
  build_reference_tree,
  restore_reference_selection,
} from "../src/pages/admin/AdminReferenceTree.js";

test("Reference tree groups tracked Markdown paths by repository and folder", () => {
  const { documents, tree } = build_reference_tree([
    {
      name: "fracto",
      files: [
        "README.md",
        "docs/README.md",
        "docs/Getting Started.md",
        "docs/nested/README.MD",
        "docs/nested/guide.MD",
      ],
    },
    { name: "empty-repository", files: [] },
  ]);

  assert.equal(tree.length, 1);
  assert.equal(tree[0].title, "fracto");
  assert.deepEqual(
    tree[0].children.map(({ title, isLeaf }) => ({ title, isLeaf })),
    [{ title: "docs", isLeaf: false }],
  );
  assert.equal(tree[0].readme_document_id, documents[0].id);
  const docs_folder = tree[0].children[0];
  assert.equal(docs_folder.readme_document_id, documents[1].id);
  assert.deepEqual(docs_folder.children.map(({ title }) => title), [
    "getting started",
    "nested",
  ]);
  const nested_folder = docs_folder.children[1];
  assert.equal(nested_folder.readme_document_id, documents[3].id);
  assert.deepEqual(nested_folder.children.map(({ title }) => title), ["guide"]);
  assert.equal(documents[0].tree_key, tree[0].key);
  assert.equal(documents[1].tree_key, docs_folder.key);
  assert.deepEqual(documents.map(({ path }) => path), [
    "README.md",
    "docs/README.md",
    "docs/Getting Started.md",
    "docs/nested/README.MD",
    "docs/nested/guide.MD",
  ]);
});

test("folders without a README remain selectable and carry their folder identity", () => {
  const { tree } = build_reference_tree([
    {
      name: "fracto",
      files: ["docs/guide.md", "archive/manual/guide.md"],
      folders: ["assets", "assets/icons", "docs", "archive", "archive/manual"],
    },
  ]);

  const assets_folder = tree[0].children.find((node) => node.label === "assets");
  assert.equal(assets_folder.label, "assets");
  assert.equal(assets_folder.label_color, "maroon");
  assert.equal(assets_folder.children[0].label, "icons");
  assert.equal(assets_folder.children[0].label_color, "maroon");

  const docs_folder = tree[0].children.find((node) => node.label === "docs");
  assert.equal(docs_folder.title, "docs");
  assert.equal(docs_folder.folder_path, "docs");
  assert.equal(docs_folder.readme_document_id, undefined);
  assert.deepEqual(docs_folder.children.map(({ title }) => title), ["guide"]);

  const archive_folder = tree[0].children.find((node) => node.label === "archive");
  assert.equal(archive_folder.label_color, "maroon");
  const manual_folder = archive_folder.children[0];
  assert.equal(manual_folder.label, "manual");
  assert.equal(manual_folder.title, "manual");
  assert.equal(manual_folder.children[0].title, "guide");
});

test("Reference document IDs remain unique when repositories contain same paths", () => {
  const { documents, tree } = build_reference_tree([
    { name: "fracto", files: ["guide.md"] },
    { name: "fracto-ui", files: ["guide.md"] },
  ]);

  assert.notEqual(documents[0].id, documents[1].id);
  assert.equal(tree[0].children[0].document_id, documents[0].id);
  const servers_folder = tree[0].children.find((node) => node.title === "servers");
  assert.equal(servers_folder.children[0].title, "fracto-ui");
  assert.equal(servers_folder.children[0].children[0].document_id, documents[1].id);
});

test("all service repositories are nested below the main repository servers folder", () => {
  const service_names = [
    "fracto-admin-server",
    "fracto-asset-server",
    "fracto-data-server",
    "fracto-tiles-server",
    "fracto-ui",
  ];
  const { tree } = build_reference_tree([
    { name: "fracto", files: ["README.md"] },
    ...service_names.map((name) => ({ name, files: ["README.md", "docs/guide.md"] })),
  ]);

  assert.equal(tree.length, 1);
  assert.equal(tree[0].title, "fracto");
  assert.equal(tree[0].readme_document_id !== undefined, true);
  const servers_folder = tree[0].children.find((node) => node.title === "servers");
  assert.deepEqual(servers_folder.children.map((node) => node.title), service_names);
  assert.equal(servers_folder.children[0].readme_document_id !== undefined, true);
  assert.equal(servers_folder.children[0].children[0].title, "docs");
});

test("Reference restores a selected document or folder from its saved tree key", () => {
  const { documents, tree } = build_reference_tree([
    {
      name: "fracto",
      files: ["README.md", "docs/guide.md"],
      folders: ["assets"],
    },
  ]);
  const docs_folder = tree[0].children.find((node) => node.title === "docs");
  const assets_folder = tree[0].children.find((node) => node.title === "assets");

  const restored_document = restore_reference_selection(
    tree,
    documents,
    docs_folder.children[0].key,
    "",
  );
  assert.equal(restored_document.selected_document.id, documents[1].id);
  assert.equal(restored_document.selected_tree_key, docs_folder.children[0].key);

  const restored_folder = restore_reference_selection(
    tree,
    documents,
    assets_folder.key,
    "",
  );
  assert.equal(restored_folder.selected_document, null);
  assert.equal(restored_folder.selected_tree_key, assets_folder.key);
});
