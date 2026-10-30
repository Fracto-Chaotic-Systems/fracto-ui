import { useEffect, useMemo, useState } from "react";
import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import {
  WORDNET_TEXT,
  KEY_GAMES_WORDNET_TITLE,
} from "../../text/GamesText.jsx";
import CoolTree from "../../utils/ui/CoolTree.jsx";
import { build_wordnet_tree } from "./WordnetTree.js";
import {
  ReferenceLayout,
  TreePane,
  DetailsPane,
} from "./GamesWordnetStyles.jsx";

const GamesWordnet = () => {
  const [graph, set_graph] = useState(null);
  const [expanded, set_expanded] = useState([]);
  const [selected_id, set_selected_id] = useState(null);
  const [failed, set_failed] = useState(false);
  const [attempt, set_attempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}wordnet/abstract-nouns.json`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.schema_version !== 1 || !data.nodes?.[data.root])
          throw new Error("Invalid WordNet graph");
        set_graph(data);
        set_expanded([data.root]);
        set_selected_id(data.root);
      })
      .catch(() => {
        if (!controller.signal.aborted) set_failed(true);
      });
    return () => controller.abort();
  }, [attempt]);
  const tree = useMemo(
    () => (graph ? build_wordnet_tree(graph, expanded) : []),
    [graph, expanded],
  );
  const selected = graph?.nodes[selected_id];
  return (
    <>
      <styles.SectionTitle>
        {AppText.get(KEY_GAMES_WORDNET_TITLE)}
      </styles.SectionTitle>
      {!graph ? (
        <p role="status">
          {AppText.get(failed ? WORDNET_TEXT.error : WORDNET_TEXT.loading)}
          {failed && (
            <button
              onClick={() => {
                set_failed(false);
                set_attempt(attempt + 1);
              }}
            >
              {AppText.get(WORDNET_TEXT.retry)}
            </button>
          )}
        </p>
      ) : (
        <ReferenceLayout>
          <TreePane>
            <CoolTree
              tree_data={tree}
              expanded_keys={expanded}
              on_expand={set_expanded}
              on_select={(_, context) =>
                set_selected_id(context.items[0]?.metadata?.synset_id ?? null)
              }
              tree_label={AppText.get(WORDNET_TEXT.tree)}
              show_live_description={false}
            />
          </TreePane>
          <DetailsPane>
            <p>{AppText.get(WORDNET_TEXT.scope)}</p>
            <p>
              {graph.node_count.toLocaleString()}{" "}
              {AppText.get(WORDNET_TEXT.count)}
            </p>
            {selected && (
              <>
                <h3>
                  {selected.words
                    .map((word) => word.replaceAll("_", " "))
                    .join(", ")}
                </h3>
                <p>{selected.gloss}</p>
                <p>
                  {AppText.get(WORDNET_TEXT.synset)}: {selected.id}
                </p>
                <p>
                  {AppText.get(WORDNET_TEXT.children)}:{" "}
                  {selected.children.length}
                </p>
              </>
            )}
            <p>
              {graph.source} �{" "}
              <a href={`${import.meta.env.BASE_URL}wordnet/LICENSE.txt`}>
                {AppText.get(WORDNET_TEXT.license)}
              </a>
            </p>
          </DetailsPane>
        </ReferenceLayout>
      )}
    </>
  );
};
export default GamesWordnet;
