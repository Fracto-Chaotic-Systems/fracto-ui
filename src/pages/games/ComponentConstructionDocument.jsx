import { useState } from "react";
import AppText from "../../AppText.jsx";
import { COMPONENT_STAGE_TEXT } from "../../text/GamesText.jsx";
import { COMPONENT_DESCRIPTION_LIMIT } from "@fracto/sdk/FractoComponentDocument.js";
import MarkdownDocument from "../../utils/ui/MarkdownDocument.jsx";
import {
  ConstructionDocumentStyles,
  ConstructionDocumentBody,
} from "./ComponentStageStyles.jsx";

const text = (key) => AppText.get(COMPONENT_STAGE_TEXT[key]);
// Descriptions are authoring data. Render references as text and avoid loading
// remote media; raw HTML remains disabled by the shared Markdown renderer.
const Reference = ({ children }) => <span>{children}</span>;
const ImageReference = ({ alt }) => <span>{alt}</span>;
const markdown_components = { a: Reference, img: ImageReference };

export default function ComponentConstructionDocument({
  document,
  on_change,
  disabled,
  hidden,
}) {
  const [editing, set_editing] = useState(false);
  const value = document.construction_description ?? "";
  return (
    <ConstructionDocumentStyles
      hidden={hidden}
      aria-label={text("construction_document")}
    >
      <header>
        <h3>
          {text("construction_document")} · {document.name}
        </h3>
        <button
          type="button"
          aria-pressed={!editing}
          onClick={() => set_editing(false)}
        >
          {text("document_read")}
        </button>
        <button
          type="button"
          aria-pressed={editing}
          disabled={disabled}
          onClick={() => set_editing(true)}
        >
          {text("document_edit")}
        </button>
      </header>
      <p>{text("document_help")}</p>
      {editing ? (
        <>
          <label htmlFor="component-construction-description">
            {text("document_text")}
          </label>
          <textarea
            id="component-construction-description"
            value={value}
            maxLength={COMPONENT_DESCRIPTION_LIMIT}
            disabled={disabled}
            spellCheck
            onChange={(event) =>
              on_change({
                ...document,
                construction_description: event.target.value,
              })
            }
          />
          <small>
            {value.length.toLocaleString()} /{" "}
            {COMPONENT_DESCRIPTION_LIMIT.toLocaleString()}
          </small>
        </>
      ) : (
        <ConstructionDocumentBody>
          {value ? (
            <MarkdownDocument components={markdown_components}>
              {value}
            </MarkdownDocument>
          ) : (
            <p>{text("document_empty")}</p>
          )}
        </ConstructionDocumentBody>
      )}
    </ConstructionDocumentStyles>
  );
}
