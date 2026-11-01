import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("shared Markdown preserves reference typography, extensions and safe notes", async () => {
  const server = await createServer({
    logLevel: "error",
    ssr: { noExternal: ["styled-components"] },
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const { default: Document } = await server.ssrLoadModule(
      "/src/utils/ui/MarkdownDocument.jsx",
    );
    const { default: Notes } = await server.ssrLoadModule(
      "/src/pages/games/WorldsNotes.jsx",
    );
    const { default: styles } = await server.ssrLoadModule(
      "/src/utils/ui/styles/MarkdownStyles.jsx",
    );
    const text =
      "## Second\n\n### Third\n\n- **Bold**\n\nhttps://example.org\n\n<script>alert(1)</script>\n\n[bad](javascript:alert)\n\n| A | B |\n| - | - |\n| 1 | 2 |";
    const render = (component, props) =>
      renderToStaticMarkup(React.createElement(component, props));
    const linked_notes = render(Notes, {
      cardinality: 68,
      value: "See #51 and world 48; `#51` remains code.",
      world_cards: [48, 51, 68],
      on_world: () => {},
      on_save: async () => {},
      on_reload: () => {},
      on_expand: () => 400,
    });
    assert.match(linked_notes, /href="#world-row-51"/);
    assert.match(linked_notes, /href="#world-row-48"/);
    assert.ok(!linked_notes.includes('target="_blank"'));
    const reference = render(Document, { children: text });
    const notes = render(Notes, {
      cardinality: 1,
      value: text,
      on_save: async () => {},
      on_reload: () => {},
      on_expand: () => 400,
    });
    for (const tag of ["h2", "h3", "p", "ul", "table", "th", "td"]) {
      const pattern = new RegExp(`<${tag} class="([^"]+)"`);
      assert.equal(
        notes.match(pattern)?.[1],
        reference.match(pattern)?.[1],
        tag,
      );
      assert.ok(reference.match(pattern), tag);
    }
    assert.match(styles.Heading2.componentStyle.rules.join(""), /1\.35rem/);
    assert.match(styles.Heading3.componentStyle.rules.join(""), /1\.1rem/);
    assert.ok(!notes.includes("<script>"));
    assert.ok(!notes.includes('node="[object Object]"'));
    assert.ok(!notes.includes('href="javascript:'));
    assert.ok(notes.includes('target="_blank"'));
    assert.ok(notes.includes('rel="noopener noreferrer"'));
    const override = render(Document, {
      children: "## Custom\n\n### Default",
      components: {
        h2: ({ children }) =>
          React.createElement("h2", { "data-custom": "yes" }, children),
      },
    });
    assert.match(override, /data-custom="yes"/);
    assert.match(override, /<h3 class=/);
    assert.ok(
      !render(Document, {
        children: '<div data-media="yes">media</div>',
      }).includes('data-media="yes"'),
    );
    assert.ok(
      render(Document, {
        children: '<div data-media="yes">media</div>',
        allow_html: true,
      }).includes('data-media="yes"'),
    );
  } finally {
    await server.close();
  }
});
