import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { randomUUID } from "node:crypto";
import { create_component_document } from "@fracto/sdk/FractoComponentDocument.js";

const nodes = (tree) =>
  !tree || typeof tree !== "object"
    ? []
    : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
function harness() {
  const source = readFileSync(
    new URL(
      "../src/pages/games/ComponentConstructionDocument.jsx",
      import.meta.url,
    ),
    "utf8",
  ).replace(/^import[\s\S]*?;\r?\n/gm, "");
  const module = { exports: {} };
  runInNewContext(
    transformSync(source, { loader: "jsx", format: "cjs", jsx: "automatic" })
      .code,
    {
      module,
      exports: module.exports,
      require: createRequire(import.meta.url),
      AppText: { get: (key) => key },
      COMPONENT_STAGE_TEXT: new Proxy({}, { get: (_, key) => key }),
      MarkdownDocument: "markdown",
      ConstructionDocumentStyles: "section",
      ConstructionDocumentBody: "article",
    },
  );
  return (props) => module.exports.default(props);
}

test("the construction tab shows the document read-only, with safe references", () => {
  const render = harness();
  const document = {
    ...create_component_document(randomUUID(), "Grass strip"),
    construction_description: "# Grass\n\nUse **openings**.",
  };
  const tree = render({ document });
  assert.equal(tree.props["aria-label"], "construction_document");
  const markdown = nodes(tree).find((n) => n.type === "markdown");
  assert.equal(markdown.props.children, document.construction_description);
  assert.equal(
    markdown.props.components.a({
      children: "Source",
      href: "javascript:evil()",
    }).props.href,
    undefined,
  );
  assert.equal(
    markdown.props.components.img({
      alt: "Reference",
      src: "https://example.invalid/tracker",
    }).props.src,
    undefined,
  );
  // No heading, help text, Read/Edit buttons or editor.
  for (const type of ["header", "h3", "button", "textarea", "label", "small"])
    assert.equal(
      nodes(tree).some((n) => n.type === type),
      false,
      type,
    );
  assert.equal(
    nodes(tree).filter((n) => n.type === "p").length,
    0,
    "no help paragraph",
  );
  assert.equal(render({ document, hidden: true }).props.hidden, true);
});

test("components without a construction document say so", () => {
  const render = harness();
  const tree = render({
    document: create_component_document(randomUUID(), "New"),
  });
  assert.ok(nodes(tree).some((n) => n.props.children === "document_empty"));
  assert.equal(
    nodes(tree).some((n) => n.type === "markdown"),
    false,
  );
});
