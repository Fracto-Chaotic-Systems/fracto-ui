import WordnetWorldLink from "./WordnetWorldLink.jsx";
import { useMemo } from "react";
import PropTypes from "prop-types";
import AppText from "../../AppText.jsx";
import { WORDNET_TEXT } from "../../text/GamesText.jsx";
import { wordnet_descendants } from "./WordnetTree.js";
import {
  MetadataLine,
  EntryTitle,
  EntryDefinition,
  Breadcrumbs,
  DescendantTree,
  SynsetButton,
} from "./GamesWordnetStyles.jsx";

const title = (node) =>
  node.words.map((word) => word.replaceAll("_", " ")).join(", ");
const WordnetDetails = ({ graph, selected_path, on_select }) => {
  const ids = selected_path.split("/");
  const selected = graph.nodes[ids.at(-1)];
  const descendants = useMemo(
    () => wordnet_descendants(graph, selected_path),
    [graph, selected_path],
  );
  const branches = (nodes) => (
    <ul>
      {nodes.map((node) => (
        <li key={node.key}>
          <SynsetButton
            type="button"
            onClick={() => on_select(node.key)}
            title={graph.nodes[node.id].gloss}
          >
            {node.title}
          </SynsetButton>
          {node.children.length > 0 && branches(node.children)}
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <EntryTitle>{title(selected)}</EntryTitle>
      <EntryDefinition>{selected.gloss}</EntryDefinition>
      {ids.length > 1 && (
        <Breadcrumbs aria-label={AppText.get(WORDNET_TEXT.predecessors)}>
          <h4>{AppText.get(WORDNET_TEXT.predecessors)}</h4>
          <ol>
            {ids.slice(0, -1).map((id, index) => (
              <li key={id} style={{ "--predecessor-depth": index }}>
                <SynsetButton
                  type="button"
                  onClick={() => on_select(ids.slice(0, index + 1).join("/"))}
                >
                  {title(graph.nodes[id])}
                </SynsetButton>
              </li>
            ))}
          </ol>
        </Breadcrumbs>
      )}
      {descendants.length > 0 && (
        <DescendantTree>
          <h4>{AppText.get(WORDNET_TEXT.descendants)}</h4>
          {branches(descendants)}
        </DescendantTree>
      )}
      <WordnetWorldLink synset_id={selected.id} />
      <MetadataLine>
        {AppText.get(WORDNET_TEXT.synset)}: {selected.id}
      </MetadataLine>
    </>
  );
};
WordnetDetails.propTypes = {
  graph: PropTypes.object.isRequired,
  selected_path: PropTypes.string.isRequired,
  on_select: PropTypes.func.isRequired,
};
export default WordnetDetails;
