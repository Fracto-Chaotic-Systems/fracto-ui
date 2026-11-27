import AppText from "../../AppText.jsx";
import { COMPONENT_STAGE_TEXT } from "../../text/GamesText.jsx";
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

/** The component's construction document, read-only, in the "construction" tab. */
export default function ComponentConstructionDocument({ document, hidden }) {
  const value = document.construction_description ?? "";
  return (
    <ConstructionDocumentStyles
      hidden={hidden}
      aria-label={text("construction_document")}
    >
      <ConstructionDocumentBody>
        {value ? (
          <MarkdownDocument components={markdown_components}>
            {value}
          </MarkdownDocument>
        ) : (
          <p>{text("document_empty")}</p>
        )}
      </ConstructionDocumentBody>
    </ConstructionDocumentStyles>
  );
}
