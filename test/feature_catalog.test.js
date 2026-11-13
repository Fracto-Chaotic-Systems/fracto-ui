import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { validate_catalog } from "../src/features/catalog_contract.js";
import { check_catalog, UI_ROOT } from "../scripts/check_feature_catalog.js";
import {
  CHAT_FILE_ACCEPT,
  CHAT_FILE_LIMIT,
  CHAT_FILE_COUNT,
} from "../src/pages/admin/chat_attachments.js";
import { validate_provider } from "../../fracto-ai-server/subject_providers/contracts.js";

const original = JSON.parse(
  readFileSync(path.join(UI_ROOT, "src/features/catalog.json"), "utf8"),
);
const copy = () => structuredClone(original);
const patched = (file, before, after) => (requested) => {
  const text = readFileSync(path.join(UI_ROOT, requested), "utf8");
  if (requested !== file) return text;
  assert.ok(text.includes(before), "Source fixture anchor drifted");
  return text.replace(before, after);
};

test("catalog covers every route and sidebar destination with valid source/settings references", () => {
  assert.deepEqual(check_catalog(original), { areas: 7, features: 54 });
  assert.equal(
    original.features.filter((feature) => feature.section !== null).length,
    53,
  );
});

test("catalog distinguishes labels, page titles and incomplete destinations", () => {
  const feature = (id) => original.features.find((entry) => entry.id === id);
  assert.equal(
    original.areas.find((area) => area.id === "assets").label.text,
    "artifacts",
  );
  assert.equal(feature("admin-chat").label.text, "chat");
  assert.equal(feature("admin-chat").title.text, "fracto AI");
  assert.equal(feature("study-full-map").title.text, "logistic map");
  assert.equal(feature("study-full-map").availability, "placeholder");
  assert.equal(feature("data-overview").title.text, "data backups");
  assert.equal(feature("data-overview").availability, "placeholder");
  for (const id of ["games-overview", "games-settings", "games-status"]) {
    assert.equal(feature(id).availability, "empty");
    assert.equal(feature(id).component, null);
  }
  const chat = feature("admin-chat");
  assert.equal(chat.access, "admin-chat");
  assert.ok(chat.limitations.join(" ").includes(String(CHAT_FILE_LIMIT)));
  assert.ok(chat.limitations.join(" ").includes("four"));
  assert.equal(CHAT_FILE_COUNT, 4);
  assert.ok(CHAT_FILE_ACCEPT.includes(".csv"));
});

test("catalog rejects unknown fields, dangling relationships, invalid references and false empty states", () => {
  for (const mutate of [
    (c) => {
      c.catalog_version = "01.0.0";
    },
    (c) => {
      c.runtime_values = {};
    },
    (c) => {
      c.access_profiles[0] = null;
    },
    (c) => {
      c.features[0].related_features = ["missing"];
    },
    (c) => {
      c.features[0].access = "grant-everything";
    },
    (c) => {
      c.features[0].sources[0].path = "../.env";
    },
    (c) => {
      c.features[0].environment = [
        { name: "FRACTO_SECRET", repository: "ui", path: ".env" },
      ];
    },
    (c) => {
      c.features[0].availability = "empty";
    },
    (c) => {
      c.features[0].limitations = [];
    },
    (c) => {
      c.features.push(structuredClone(c.features[0]));
    },
  ]) {
    const catalog = copy();
    mutate(catalog);
    assert.throws(() => validate_catalog(catalog), /INVALID_FEATURE_CATALOG/);
  }
});

test("route, sidebar, title and settings changes fail drift checks until the catalog is reviewed", () => {
  const missing = copy();
  missing.features.splice(1, 1);
  assert.throws(() => check_catalog(missing), /coverage|related|INVALID/);
  assert.throws(() =>
    check_catalog(
      original,
      patched("src/App.jsx", 'path: "/admin"', 'path: "/administration"'),
    ),
  );
  assert.throws(
    () =>
      check_catalog(
        original,
        patched(
          "src/text/RootText.jsx",
          '[KEY_MENU_ASSETS]: "artifacts"',
          '[KEY_MENU_ASSETS]: "assets"',
        ),
      ),
    /drifted/,
  );
  assert.throws(
    () =>
      check_catalog(
        original,
        patched(
          "src/text/AdminText.jsx",
          '[KEY_ADMIN_CHAT_TITLE]: "fracto AI"',
          '[KEY_ADMIN_CHAT_TITLE]: "Updated AI"',
        ),
      ),
    /drifted/,
  );
  assert.throws(
    () =>
      check_catalog(
        original,
        patched(
          "src/pages/Admin.jsx",
          "right_pane: <AdminChat />",
          "right_pane: <AdminOverview />",
        ),
      ),
    /drifted/,
  );
  assert.throws(
    () =>
      check_catalog(
        original,
        patched(
          "src/settings/AdminSettings.jsx",
          "[KEY_ADMIN_SECTION]: {",
          "[KEY_ADMIN_SOCIAL_DOCUMENT]: {",
        ),
      ),
    /Missing selection/,
  );
});

test("source inspection rejects dynamic registries without evaluating application code", () => {
  assert.equal(globalThis.catalog_executed, undefined);
  assert.throws(
    () =>
      check_catalog(
        original,
        patched(
          "src/App.jsx",
          "const ROUTES = [",
          "const ROUTES = (() => { globalThis.catalog_executed = true; return []; })(); const UNUSED_ROUTES = [",
        ),
      ),
    /UNSUPPORTED_CATALOG_SOURCE/,
  );
  assert.equal(globalThis.catalog_executed, undefined);
});

test("subject-provider declaration binds the reviewed catalog to all app areas without seeding", () => {
  const provider = JSON.parse(
    readFileSync(
      path.resolve(UI_ROOT, "../fracto-ai-server/subject_providers/ui.json"),
      "utf8",
    ),
  );
  const normalized = validate_provider(provider);
  assert.equal(normalized.provider_id, "ui-features");
  assert.deepEqual(normalized.sources, [
    { id: "catalog", repository: "ui", path: "src/features/catalog.json" },
  ]);
  assert.deepEqual(
    normalized.documents.map((document) => document.id),
    original.areas.map((area) => area.id).sort(),
  );
  assert.ok(
    readFileSync(path.join(UI_ROOT, "src/features/catalog.json")).length <=
      normalized.limits.source_bytes,
  );
});
