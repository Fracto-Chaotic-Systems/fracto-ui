import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { extract_ui_catalog } from "../src/features/knowledge_documents.js";
import { validate_documents } from "../../fracto-ai-server/subject_providers/contracts.js";

const input = () =>
  JSON.parse(
    readFileSync(
      new URL("../src/features/catalog.json", import.meta.url),
      "utf8",
    ),
  );
const extract = (catalog = input(), signal) =>
  extract_ui_catalog({
    sources: [{ id: "catalog", text: JSON.stringify(catalog) }],
    signal,
  });
test("UI extractor emits seven bounded area documents covering all feature states and configuration", async () => {
  const documents = await extract();
  const definition = JSON.parse(
    readFileSync(
      new URL(
        "../../fracto-ai-server/subject_providers/ui.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(validate_documents(definition, documents).length, 7);
  assert.equal(
    documents.reduce(
      (total, document) =>
        total + (document.text.match(/^### .*\([^\n]+\)$/gm) || []).length,
      0,
    ),
    53,
  );
  const admin = documents.find((document) => document.id === "admin").text;
  assert.ok(admin.includes("fracto AI"));
  assert.ok(admin.includes("FRACTO_ADMIN_CHAT_LAB_BYPASS"));
  assert.ok(admin.includes("8192"));
  assert.ok(admin.includes("4096"));
  assert.ok(
    documents
      .find((document) => document.id === "games")
      .text.includes("Implementation state: empty"),
  );
  assert.ok(
    documents
      .find((document) => document.id === "study")
      .text.includes("logistic map"),
  );
});
test("UI extraction is deterministic and does not mutate catalog input", async () => {
  const catalog = input(),
    before = structuredClone(catalog);
  assert.deepEqual(await extract(catalog), await extract(catalog));
  assert.deepEqual(catalog, before);
});
test("UI extractor rejects invalid source contracts and respects cancellation", async () => {
  await assert.rejects(
    extract_ui_catalog({ sources: [] }),
    /INVALID_UI_CATALOG_SOURCE/,
  );
  await assert.rejects(
    extract_ui_catalog({ sources: [{ id: "other", text: "{}" }] }),
    /INVALID_UI_CATALOG_SOURCE/,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(extract(input(), controller.signal), {
    name: "AbortError",
  });
});
test("authored text cannot introduce Markdown headings or HTML into generated structure", async () => {
  const catalog = input();
  catalog.features[0].purpose = "# Injected\n<script>example</script>";
  const admin = (await extract(catalog)).find(
    (document) => document.id === "admin",
  ).text;
  assert.ok(!admin.includes("\n# Injected"));
  assert.ok(!admin.includes("<script>"));
  assert.ok(admin.includes("\\<script\\>"));
});
