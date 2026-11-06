import assert from "node:assert/strict";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { source_reader } from "./catalog_source_facts.js";
import { navigation_facts } from "./catalog_navigation.js";
import process from "node:process";
import { validate_catalog } from "../src/features/catalog_contract.js";

export const UI_ROOT = path.resolve(import.meta.dirname, "..");
const MAIN_ROOT = path.resolve(UI_ROOT, "../..");
const REPO_ROOTS = {
  main: MAIN_ROOT,
  ui: UI_ROOT,
  ai: path.join(MAIN_ROOT, "servers/fracto-ai-server"),
  admin: path.join(MAIN_ROOT, "servers/fracto-admin-server"),
  data: path.join(MAIN_ROOT, "servers/fracto-data-server"),
  assets: path.join(MAIN_ROOT, "servers/fracto-asset-server"),
  tiles: path.join(MAIN_ROOT, "servers/fracto-tiles-server"),
};

export const check_catalog = (catalog, read_ui) => {
  validate_catalog(catalog);
  const facts = navigation_facts(UI_ROOT, read_ui);
  assert.deepEqual(
    catalog.areas,
    facts.map(({ features, ...area }) => area),
    "Catalog routes/labels/selection settings drifted",
  );
  const expected = facts.flatMap((area) =>
    area.features.map((feature) => ({ ...feature, area: area.id })),
  );
  const actual = catalog.features.filter((feature) => feature.section !== null);
  assert.deepEqual(
    actual.map((feature) => feature.id),
    expected.map((feature) => feature.id),
    "Catalog sidebar coverage/order drifted",
  );
  for (const entry of expected) {
    const feature = actual.find((candidate) => candidate.id === entry.id);
    for (const key of [
      "area",
      "section",
      "component",
      "label",
      "title",
      "settings",
    ])
      assert.deepEqual(
        feature[key],
        entry[key],
        `Catalog ${entry.id} ${key} drifted`,
      );
    if (!entry.component) assert.equal(feature.availability, "empty");
  }
  const home = catalog.features.filter((feature) => feature.section === null);
  assert.equal(home.length, 1);
  assert.equal(home[0].id, "home");
  assert.equal(home[0].area, "home");
  assert.equal(home[0].component, "src/pages/PageWelcome.jsx");
  const reader = source_reader(UI_ROOT, read_ui);
  assert.deepEqual(
    home[0].label,
    catalog.areas.find((area) => area.id === "home").label,
  );
  assert.deepEqual(
    home[0].title,
    reader.text(home[0].component, "KEY_WELCOME_TITLE"),
    "Catalog home title drifted",
  );
  for (const area of catalog.areas.filter(
    (entry) => entry.selection_key !== null,
  )) {
    const settings = reader.module(area.settings_source);
    assert.ok(
      [...settings.bindings.values()].some(
        (binding) =>
          binding.node?.type === "ObjectExpression" &&
          binding.node.properties.some(
            (property) =>
              property.computed &&
              property.key.type === "Identifier" &&
              reader.identifier(area.settings_source, property.key.name) ===
                area.selection_key,
          ),
      ),
      `Missing selection setting for ${area.id}`,
    );
  }
  // References contain approved logical paths, never local configuration values.
  const references = [
    ...catalog.access_profiles.flatMap((entry) => entry.sources),
    ...catalog.features.flatMap((entry) => [
      ...entry.sources,
      ...entry.environment,
    ]),
  ];
  for (const reference of references) {
    const root = realpathSync(REPO_ROOTS[reference.repository]);
    const target = realpathSync(path.join(root, reference.path));
    const relative = path.relative(root, target);
    assert.ok(
      relative && !relative.startsWith("..") && !path.isAbsolute(relative),
      "Catalog reference escaped its repository",
    );
    if (reference.name)
      assert.ok(
        readFileSync(target, "utf8").includes(reference.name),
        `Undeclared environment reference ${reference.name}`,
      );
  }
  return { areas: catalog.areas.length, features: catalog.features.length };
};

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  try {
    const catalog = JSON.parse(
      readFileSync(path.join(UI_ROOT, "src/features/catalog.json"), "utf8"),
    );
    const result = check_catalog(catalog);
    console.log(
      `Feature catalog checked: ${result.areas} areas, ${result.features} destinations.`,
    );
  } catch (error) {
    console.error(`Feature catalog validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
