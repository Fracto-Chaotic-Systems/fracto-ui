import test from "node:test";
import assert from "node:assert/strict";
import { merge_commit_timeline } from "../src/pages/admin/AdminCommitTimeline.js";

const commit_row = (commit) => ({ row_type: "commit", hash: commit.hash });

test("merges a tag event once at its timestamp", () => {
  const rows = merge_commit_timeline({
    commits: [
      { hash: "new", date: "2026-09-22T12:00:00Z" },
      { hash: "old", date: "2026-09-22T10:00:00Z" },
    ],
    tag_events: [
      {
        name: "milestone/test",
        created_at: "2026-09-22T11:00:00Z",
        repositories: ["fracto", "fracto-ui"],
      },
    ],
    repository_visibility: { fracto: true, "fracto-ui": true },
    create_commit_row: commit_row,
  });

  assert.deepEqual(rows, [
    { row_type: "commit", hash: "new" },
    {
      row_type: "tag_event",
      tag_event: {
        name: "milestone/test",
        created_at: "2026-09-22T11:00:00Z",
        repositories: ["fracto", "fracto-ui"],
      },
    },
    { row_type: "commit", hash: "old" },
  ]);
});

test("keeps a tag newer than every commit at the top", () => {
  const rows = merge_commit_timeline({
    commits: [{ hash: "old", date: "2026-09-22T10:00:00Z" }],
    tag_events: [
      {
        name: "milestone/new",
        created_at: "2026-09-22T11:00:00Z",
        repositories: ["fracto"],
      },
    ],
    repository_visibility: { fracto: true },
    create_commit_row: commit_row,
  });

  assert.equal(rows[0].row_type, "tag_event");
  assert.equal(rows[1].hash, "old");
});

test("hides tag events when all of their repositories are filtered out", () => {
  const rows = merge_commit_timeline({
    commits: [{ hash: "visible", date: "2026-09-22T10:00:00Z" }],
    tag_events: [
      {
        name: "milestone/hidden",
        created_at: "2026-09-22T11:00:00Z",
        repositories: ["fracto-ui"],
      },
    ],
    repository_visibility: { fracto: true, "fracto-ui": false },
    create_commit_row: commit_row,
  });

  assert.deepEqual(rows, [{ row_type: "commit", hash: "visible" }]);
});
