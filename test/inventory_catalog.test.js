import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ATTRIBUTION_FIELDS,
  parse_catalog_record,
  read_catalog_draft,
  save_catalog_draft,
  safe_catalog_url,
  update_catalog_record,
  write_catalog_file,
} from "../src/pages/games/InventoryCatalog.js";

const seed = () =>
  JSON.parse(
    readFileSync(
      new URL("../src/pages/games/InventoryCatalogSeeds.json", import.meta.url),
      "utf8",
    ),
  )["grass-patch-001"];
const fields = (record) =>
  Object.fromEntries(
    ATTRIBUTION_FIELDS.map((key) => [key, record.attribution[key] || ""]),
  );

test("catalog edits preserve source hashes, runtime data, unknown fields and existing history", () => {
  const original = seed();
  original.future_extension = { preserve: true };
  const before = structuredClone(original);
  const next = update_catalog_record(
    original,
    { ...fields(original), license_name: "Unverified example" },
    "Material tuning note",
    new Date(2026, 10, 22),
  );
  assert.deepEqual(original, before);
  assert.deepEqual(next.sources, original.sources);
  assert.deepEqual(next.runtime, original.runtime);
  assert.deepEqual(next.future_extension, original.future_extension);
  assert.deepEqual(
    next.history.slice(0, original.history.length),
    original.history,
  );
  assert.equal(next.history.at(-2).action, "update-attribution");
  assert.equal(next.history.at(-1).description, "Material tuning note");
  assert.equal(next.history.at(-1).date, "2026-11-22");
  assert.equal(next.attribution.status, "unresolved");
  assert.equal(next.attribution.creator_name, null);
});

test("empty edits do not invent attribution or append duplicate history", () => {
  const original = seed();
  assert.deepEqual(update_catalog_record(original, fields(original)), original);
  const next = update_catalog_record(original, {
    ...fields(original),
    creator_name: "Example creator",
    source_url: "https://example.com/model",
    license_name: "Example license",
    credit_text: "Example credit",
  });
  assert.equal(next.attribution.status, "recorded-unverified");
});

test("imports reject other assets and malformed rendered values; unsafe links are never used", () => {
  const original = seed();
  assert.throws(() =>
    parse_catalog_record(JSON.stringify(original), "other-id"),
  );
  for (const value of [null, {}, 123]) {
    assert.throws(() =>
      parse_catalog_record(
        JSON.stringify({ ...original, description: value }),
        original.id,
      ),
    );
  }
  assert.equal(safe_catalog_url("javascript:alert(1)"), null);
  assert.equal(safe_catalog_url("file:///etc/passwd"), null);
  assert.equal(
    safe_catalog_url("https://example.com/asset"),
    "https://example.com/asset",
  );
  assert.throws(
    () =>
      update_catalog_record(original, {
        ...fields(original),
        source_url: "javascript:alert(1)",
      }),
    /invalid_url/,
  );
});

test("browser drafts are scoped to an asset and storage failures are reported", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  };
  const original = seed();
  const next = update_catalog_record(original, {
    ...fields(original),
    creator_name: "Example creator",
  });
  save_catalog_draft(next, storage);
  assert.deepEqual(read_catalog_draft(original, storage), next);
  assert.equal(
    read_catalog_draft({ ...original, id: "other-id" }, storage).id,
    "other-id",
  );
  assert.throws(
    () =>
      save_catalog_draft(next, {
        setItem() {
          throw Error("quota");
        },
      }),
    /quota/,
  );
});

test("file save writes the complete record only if the original file is unchanged", async () => {
  const record = seed();
  const original_raw = JSON.stringify(record);
  let actual = original_raw,
    writes = 0;
  const handle = {
    getFile: async () => ({ text: async () => actual }),
    createWritable: async () => ({
      write: async (raw) => {
        actual = raw;
        writes++;
      },
      close: async () => {},
      abort: async () => {},
    }),
  };
  const next = update_catalog_record(record, {
    ...fields(record),
    license_name: "Example license",
  });
  const raw = await write_catalog_file(handle, original_raw, next);
  assert.deepEqual(JSON.parse(raw), next);
  assert.equal(actual, raw);
  actual = original_raw + " ";
  await assert.rejects(write_catalog_file(handle, raw, next), /file_conflict/);
  assert.equal(writes, 1);
});

test("failed file writes abort without reporting success", async () => {
  let aborted = false;
  const handle = {
    getFile: async () => ({ text: async () => "original" }),
    createWritable: async () => ({
      write: async () => {
        throw Error("disk failure");
      },
      close: async () => assert.fail("Must not close a failed write"),
      abort: async () => {
        aborted = true;
      },
    }),
  };
  await assert.rejects(
    write_catalog_file(handle, "original", seed()),
    /disk failure/,
  );
  assert.equal(aborted, true);
});
