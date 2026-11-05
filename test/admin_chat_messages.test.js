import assert from "node:assert/strict";
import test from "node:test";
import { prepare_chat_messages } from "../src/pages/admin/chat_messages.js";
import {
  extract_chat_file,
  create_chat_attachment_adapter,
} from "../src/pages/admin/chat_attachments.js";

const message = (role, text) => ({ role, content: [{ type: "text", text }] });
test("chat keeps recent conversation within count and UTF-8 byte budgets", () => {
  const history = Array.from({ length: 21 }, (_, i) =>
    message(i % 2 ? "assistant" : "user", `Message ${i}`),
  );
  const result = prepare_chat_messages(history);
  assert.equal(result.length, 16);
  assert.equal(result.at(-1).content, "Message 20");
  const large = prepare_chat_messages([
    message("user", "é".repeat(3000)),
    message("assistant", "old answer"),
    message("user", "é".repeat(2000)),
  ]);
  assert.equal(large.length, 2);
  assert.equal(large.at(-1).content, "é".repeat(2000));
});
test("chat preserves newest input and rejects oversized input and attachments", () => {
  assert.throws(
    () => prepare_chat_messages([message("user", "é".repeat(4096))]),
    /CHAT_REQUEST_TOO_LARGE/,
  );
  assert.throws(
    () =>
      prepare_chat_messages([{ ...message("user", "x"), attachments: [{}] }]),
    /CHAT_FILE_PENDING/,
  );
  assert.throws(
    () =>
      prepare_chat_messages([{ role: "user", content: [{ type: "image" }] }]),
    /CHAT_FILES_UNSUPPORTED/,
  );
  assert.throws(() => prepare_chat_messages([]), /INVALID_CHAT_REQUEST/);
  const result = prepare_chat_messages([
    message("user", "question"),
    message("assistant", ""),
    message("user", "follow-up"),
  ]);
  assert.equal(result.length, 2);
});

test("attachments extract supported UTF-8 formats and preserve exact file text", async () => {
  for (const [name, text] of [
    ["notes.txt", "Plain text"],
    ["README.MD", "# Title\nText"],
    ["notes.markdown", "**Important**"],
    ["data.json", '{"count": 2}'],
    ["data.csv", "name,count\nA,2"],
  ]) {
    const file = new File([text], name);
    assert.equal(
      await extract_chat_file(file),
      `Attached file ${JSON.stringify(name)} (reference data):\n${text}\nEnd attached file.`,
    );
  }
});

test("attachments reject unsupported, excessive, empty, invalid UTF-8, binary and malformed JSON", async () => {
  for (const [file, error] of [
    [new File(["text"], "image.png"), "CHAT_FILE_TYPE"],
    [new File(["text"], "report.pdf"), "CHAT_FILE_TYPE"],
    [new File(["text"], "data.txt.exe"), "CHAT_FILE_TYPE"],
    [new File(["x".repeat(4097)], "large.txt"), "CHAT_FILE_SIZE"],
    [new File(["text"], `${"x".repeat(129)}.txt`), "CHAT_FILE_NAME"],
    [new File(["  \n"], "empty.txt"), "CHAT_FILE_EMPTY"],
    [new File([new Uint8Array([0xff])], "bad.txt"), "CHAT_FILE_ENCODING"],
    [new File(["a\0b"], "binary.csv"), "CHAT_FILE_ENCODING"],
    [new File(["{bad}"], "bad.json"), "CHAT_FILE_JSON"],
  ])
    await assert.rejects(extract_chat_file(file), new RegExp(error));
  assert.ok(
    (await extract_chat_file(new File(["x".repeat(4096)], "max.txt"))).includes(
      "x".repeat(4096),
    ),
  );
  assert.ok(
    (
      await extract_chat_file(
        new File([new Uint8Array([0xef, 0xbb, 0xbf]), "{}"], "bom.json"),
      )
    ).includes("{}"),
  );
});

test("attachment adapter stages, removes, sends and limits pending files", async () => {
  const errors = [];
  const adapter = create_chat_attachment_adapter((error) => errors.push(error));
  const attachments = [];
  for (let i = 0; i < 4; i++)
    attachments.push(
      await adapter.add({ file: new File([`File ${i}`], `${i}.txt`) }),
    );
  await assert.rejects(
    adapter.add({ file: new File(["fifth"], "5.txt") }),
    /CHAT_FILE_COUNT/,
  );
  assert.equal(errors.at(-1), "CHAT_FILE_COUNT");
  await adapter.remove(attachments.pop());
  attachments.push(
    await adapter.add({ file: new File(["replacement"], "new.txt") }),
  );
  const complete = await adapter.send(attachments[0]);
  assert.equal(complete.status.type, "complete");
  assert.equal(complete.content[0].type, "text");
  assert.equal(attachments[0].status.type, "requires-action");
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    adapter.send(attachments[1], { signal: controller.signal }),
    { name: "AbortError" },
  );
  assert.ok(await adapter.add({ file: new File(["after send"], "next.txt") }));
});

test("failed extraction does not consume an attachment slot", async () => {
  const adapter = create_chat_attachment_adapter();
  await assert.rejects(
    adapter.add({ file: new File(["invalid"], "bad.pdf") }),
    /CHAT_FILE_TYPE/,
  );
  for (let i = 0; i < 4; i++)
    assert.ok(await adapter.add({ file: new File(["ok"], `${i}.txt`) }));
});

test("file-only messages, multiple attachments and follow-up history reach text context once", async () => {
  const adapter = create_chat_attachment_adapter();
  const first = await adapter.send(
    await adapter.add({ file: new File(["Alpha,2"], "data.csv") }),
  );
  const second = await adapter.send(
    await adapter.add({ file: new File(["Beta"], "notes.md") }),
  );
  const file_message = { ...message("user", ""), attachments: [first, second] };
  const history = [
    file_message,
    message("assistant", "Found two files"),
    message("user", "Which has the number?"),
  ];
  const result = prepare_chat_messages(history);
  assert.equal(result.length, 3);
  assert.ok(result[0].content.includes("Alpha,2"));
  assert.ok(result[0].content.includes("Beta"));
  assert.equal(result[0].content.match(/Alpha,2/g).length, 1);
  assert.equal(file_message.content[0].text, "");
});

test("combined or JSON-escaped attachment data cannot bypass message limits", async () => {
  const adapter = create_chat_attachment_adapter();
  const attachments = await Promise.all(
    ["a.txt", "b.txt"].map(async (name) =>
      adapter.add({ file: new File(["x".repeat(4096)], name) }),
    ),
  );
  assert.throws(
    () =>
      prepare_chat_messages([{ ...message("user", "question"), attachments }]),
    /CHAT_REQUEST_TOO_LARGE/,
  );
  const escaped = await adapter.add({
    file: new File(["\\".repeat(4096)], "escaped.txt"),
  });
  assert.throws(
    () =>
      prepare_chat_messages([
        { ...message("user", ""), attachments: [escaped] },
      ]),
    /CHAT_REQUEST_TOO_LARGE/,
  );
});
