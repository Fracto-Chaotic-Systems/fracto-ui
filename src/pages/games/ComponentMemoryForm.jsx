import { useState } from "react";
import { memory_text as text } from "./ComponentMemoryText.js";
export default function ComponentMemoryForm({
  initial,
  on_save,
  on_cancel,
  disabled,
}) {
  const [draft, set_draft] = useState(initial),
    [keywords, set_keywords] = useState(initial.keywords.join(", "));
  const field = (key, value) =>
    set_draft((previous) => ({ ...previous, [key]: value }));
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        on_save(
          {
            ...draft,
            revision: initial.revision + 1,
            keywords: keywords.trim()
              ? keywords.split(",").map((value) => value.trim().toLowerCase())
              : [],
          },
          initial.revision,
        );
      }}
    >
      <label>
        {text("kind")}
        <select
          value={draft.kind}
          disabled={disabled}
          onChange={(event) => field("kind", event.target.value)}
        >
          <option value="preference">{text("preference")}</option>
          <option value="recipe">{text("recipe")}</option>
        </select>
      </label>
      <label>
        {text("name")}
        <input
          required
          maxLength={80}
          value={draft.title}
          disabled={disabled}
          onChange={(event) => field("title", event.target.value)}
        />
      </label>
      <label>
        {text("instructions")}
        <textarea
          required
          rows={5}
          maxLength={1000}
          value={draft.instructions}
          disabled={disabled}
          onChange={(event) => field("instructions", event.target.value)}
        />
      </label>
      <p>{text("review")}</p>
      <label>
        {text("keywords")}
        <input
          maxLength={155}
          value={keywords}
          disabled={disabled}
          onChange={(event) => set_keywords(event.target.value)}
        />
      </label>
      <p>{text("keyword_help")}</p>
      <label>
        <input
          type="checkbox"
          checked={draft.enabled}
          disabled={disabled}
          onChange={(event) => field("enabled", event.target.checked)}
        />
        {text("enabled")}
      </label>
      <button disabled={disabled}>{text("save")}</button>{" "}
      <button type="button" disabled={disabled} onClick={on_cancel}>
        {text("cancel")}
      </button>
    </form>
  );
}
