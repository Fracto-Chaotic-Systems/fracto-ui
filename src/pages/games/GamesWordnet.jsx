import AppSettings from "../../AppSettings.jsx";
import { KEY_GAMES_WORDNET_SPLITTER_POS_PX } from "../../settings/GamesSettings.jsx";
import { SPLITTER_WIDTH_PX } from "../../constants.jsx";
import CoolSplitter, {
  SPLITTER_TYPE_VERTICAL,
  SPLITTER_LAYOUT_FLOW,
} from "../../utils/ui/CoolSplitter.jsx";
import { wordnet_split_bounds } from "./WordnetLayout.js";
import WordnetDetails from "./WordnetDetails.jsx";
import PropTypes from "prop-types";
import { useEffect, useMemo, useRef, useState } from "react";
import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import {
  WORDNET_TEXT,
  KEY_GAMES_WORDNET_TITLE,
} from "../../text/GamesText.jsx";
import CoolTree from "../../utils/ui/CoolTree.jsx";
import { build_wordnet_tree, wordnet_selection } from "./WordnetTree.js";
import {
  MetadataLine,
  ReferenceLayout,
  TreePane,
  DetailsPane,
} from "./GamesWordnetStyles.jsx";

const GamesWordnet = ({ synset_id }) => {
  const tree_pane = useRef(null);
  const layout = useRef(null);
  const [bounds, set_bounds] = useState({ width: 0, height: 0 });
  const [split_position, set_split_position] = useState(() =>
    AppSettings.get(KEY_GAMES_WORDNET_SPLITTER_POS_PX),
  );
  const split = wordnet_split_bounds(
    bounds.width,
    SPLITTER_WIDTH_PX,
    split_position,
  );
  const [selected_key, set_selected_key] = useState(null);
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
        const selection = wordnet_selection(data, synset_id);
        set_expanded(selection.expanded);
        set_selected_id(selection.id);
        set_selected_key(selection.key);
      })
      .catch(() => {
        if (!controller.signal.aborted) set_failed(true);
      });
    return () => controller.abort();
  }, [attempt, synset_id]);
  useEffect(() => {
    const pane = tree_pane.current;
    if (!pane || !selected_key) return;
    const reveal = () => {
      const selected = pane.querySelector('[aria-selected="true"]');
      if (!selected) return false;
      selected.scrollIntoView({ block: "nearest", inline: "nearest" });
      return true;
    };
    if (reveal()) return;
    const observer = new MutationObserver(() => {
      if (reveal()) observer.disconnect();
    });
    observer.observe(pane, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-selected"],
    });
    return () => observer.disconnect();
  }, [graph, selected_key]);
  useEffect(() => {
    if (!layout.current) return;
    const observer = new ResizeObserver(([entry]) => {
      set_bounds({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(layout.current);
    return () => observer.disconnect();
  }, [graph]);
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
        <ReferenceLayout ref={layout}>
          <TreePane ref={tree_pane} style={{ width: split.position }}>
            <CoolTree
              tree_data={tree}
              expanded_keys={expanded}
              on_expand={set_expanded}
              selected_keys={selected_key ? [selected_key] : []}
              on_select={(keys, context) => {
                set_selected_key(keys[0] ?? null);
                set_selected_id(context.items[0]?.metadata?.synset_id ?? null);
              }}
              tree_label={AppText.get(WORDNET_TEXT.tree)}
              show_live_description={false}
            />
          </TreePane>
          <CoolSplitter
            type={SPLITTER_TYPE_VERTICAL}
            layout={SPLITTER_LAYOUT_FLOW}
            name={KEY_GAMES_WORDNET_SPLITTER_POS_PX}
            bar_width_px={SPLITTER_WIDTH_PX}
            container_bounds={bounds}
            position={split.position}
            min_position={split.min}
            max_position={split.max}
            on_change={(position) => {
              const next = Math.round(position);
              set_split_position(next);
              AppSettings.on_settings_changed({
                [KEY_GAMES_WORDNET_SPLITTER_POS_PX]: next,
              });
            }}
          />
          <DetailsPane>
            {selected && selected_key && (
              <WordnetDetails
                graph={graph}
                selected_path={selected_key}
                on_select={(path) => {
                  const ids = path.split("/");
                  set_selected_id(ids.at(-1));
                  set_selected_key(path);
                  set_expanded((previous) => [
                    ...new Set([
                      ...previous,
                      ...ids
                        .slice(0, -1)
                        .map((_, index) => ids.slice(0, index + 1).join("/")),
                    ]),
                  ]);
                }}
              />
            )}
            <MetadataLine>
              {graph.source}
              {" | "}
              <a href={`${import.meta.env.BASE_URL}wordnet/LICENSE.txt`}>
                {AppText.get(WORDNET_TEXT.license)}
              </a>
            </MetadataLine>
          </DetailsPane>
        </ReferenceLayout>
      )}
    </>
  );
};
GamesWordnet.propTypes = { synset_id: PropTypes.string };
export default GamesWordnet;
