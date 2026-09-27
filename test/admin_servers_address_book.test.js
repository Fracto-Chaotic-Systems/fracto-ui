import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  clear_server_url_entry_state,
  get_remote_server_name,
  is_health_contract_v1,
  merge_server_url,
  normalize_server_url,
  normalize_server_urls,
} from "../src/pages/admin/AdminServersUtils.js";
import {
  parse_persisted_object,
  persist_object_setting,
} from "../src/settings/AppSettingsPersistence.js";

describe("admin Servers address book", () => {
  test("normalizes HTTP(S) URLs and rejects invalid or credential-bearing URLs", () => {
    assert.equal(
      normalize_server_url(" HTTPS://Fracto.Example:443 "),
      "https://fracto.example/",
    );
    assert.equal(
      normalize_server_url("http://fracto.example/main/"),
      "http://fracto.example/main/",
    );
    assert.equal(normalize_server_url("ftp://fracto.example"), null);
    assert.equal(normalize_server_url("https://user:secret@fracto.example"), null);
    assert.equal(normalize_server_url("https://fracto.example/?token=secret"), null);
    assert.equal(normalize_server_url("not a URL"), null);
  });

  test("merges unique normalized URLs and keeps earlier addresses", () => {
    const initial = { urls: ["https://one.example", "https://two.example/"] };
    const duplicate = merge_server_url(initial, "HTTPS://ONE.EXAMPLE/");
    assert.deepEqual(duplicate, {
      accepted: true,
      address_book: { urls: ["https://one.example/", "https://two.example/"] },
    });

    const added = merge_server_url(duplicate.address_book, "https://three.example");
    assert.deepEqual(added.address_book.urls, [
      "https://one.example/",
      "https://two.example/",
      "https://three.example/",
    ]);
    assert.deepEqual(normalize_server_urls({ urls: [...added.address_book.urls, "bad"] }), added.address_book.urls);
  });

  test("invalid input leaves the saved object unchanged", () => {
    const saved = { urls: ["https://one.example/"] };
    const result = merge_server_url(saved, "file:///tmp/secret");
    assert.equal(result.accepted, false);
    assert.equal(result.address_book, saved);
  });

  test("cancelling clears the draft while preserving the saved history", () => {
    const server_urls = ["https://one.example/"];
    const state = {
      adding_server: true,
      server_url_draft: "https://unsaved.example",
      server_urls,
      url_error: "invalid",
    };
    const cancelled = clear_server_url_entry_state(state);

    assert.equal(cancelled.adding_server, false);
    assert.equal(cancelled.server_url_draft, "");
    assert.equal(cancelled.url_error, null);
    assert.equal(cancelled.server_urls, server_urls);
    assert.equal(state.server_urls, server_urls);
  });

  test("persists and restores address books larger than the default 1,000-character limit", () => {
    const address_book = {
      urls: Array.from(
        { length: 20 },
        (_, index) => `https://server-${index}.example/${"a".repeat(80)}`,
      ),
    };
    const definition = { max_persist_length: 100000 };
    const storage = new Map();
    const local_storage = {
      setItem: (key, value) => storage.set(key, value),
      getItem: (key) => storage.get(key) ?? null,
    };

    assert.equal(
      persist_object_setting(local_storage, "admin/server_address_book", definition, address_book),
      true,
    );
    assert.ok(storage.get("admin/server_address_book").length > 1000);
    const restored_address_book = parse_persisted_object(
      local_storage.getItem("admin/server_address_book"),
    );
    assert.deepEqual(restored_address_book, address_book);
    assert.deepEqual(
      normalize_server_urls(restored_address_book),
      address_book.urls,
    );
    assert.equal(
      persist_object_setting(local_storage, "admin/server_address_book", {}, address_book),
      false,
    );
  });

  test("accepts only version 1 health responses with a services map", () => {
    assert.equal(
      is_health_contract_v1({
        contract_version: 1,
        services: { "fracto-data-server": "healthy" },
      }),
      true,
    );
    assert.equal(is_health_contract_v1({ contract_version: 2, services: {} }), false);
    assert.equal(is_health_contract_v1({ contract_version: 1, services: [] }), false);
    assert.equal(is_health_contract_v1(null), false);
  });

  test("handles missing URLs when deriving a remote server name", () => {
    assert.equal(get_remote_server_name(null, ""), "");
    assert.equal(get_remote_server_name(null, "not a URL"), "");
    assert.equal(
      get_remote_server_name(null, "https://server.example/path"),
      "server.example",
    );
    assert.equal(
      get_remote_server_name({ server_name: "Configured name" }, ""),
      "Configured name",
    );
  });
});
