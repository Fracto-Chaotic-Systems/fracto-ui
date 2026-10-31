const GAMES_FOLDER = "games";

export const KEY_GAMES_WORLDS = `${GAMES_FOLDER}/worlds`;
export const KEY_GAMES_WORLDS_TITLE = `${GAMES_FOLDER}/worlds_title`;

export const KEY_GAMES_WORDNET = `${GAMES_FOLDER}/wordnet`;
export const KEY_GAMES_WORDNET_TITLE = `${GAMES_FOLDER}/wordnet_title`;

export const WORDNET_TEXT = Object.fromEntries(
  [
    "loading",
    "error",
    "retry",
    "tree",
    "scope",
    "count",
    "synset",
    "children",
    "license",
  ].map((key) => [key, `${GAMES_FOLDER}/wordnet_${key}`]),
);
export const WORLDS_TEXT = Object.fromEntries(
  [
    "cardinality",
    "assigned_only",
    "assigned_worlds",
    "factorization",
    "notes",
    "notes_placeholder",
    "association",
    "contenders",
    "help",
    "scope",
    "search",
    "drop",
    "assign",
    "previous",
    "next",
    "rows",
    "mapped",
    "clear",
    "selected",
    "none",
    "empty",
    "tray_help",
  ].map((key) => [key, `${GAMES_FOLDER}/worlds_${key}`]),
);
export const APP_GAMES_TEXT = {
  [WORLDS_TEXT.assigned_only]: "show assigned only",
  [WORLDS_TEXT.assigned_worlds]: "assigned worlds",
  [WORLDS_TEXT.cardinality]: "orbital cardinality",
  [WORLDS_TEXT.factorization]: "factorization",
  [WORLDS_TEXT.notes]: "notes",
  [WORLDS_TEXT.notes_placeholder]: "add notes...",
  [WORLDS_TEXT.association]: "WordNet association",
  [WORLDS_TEXT.contenders]: "contenders",
  [WORLDS_TEXT.help]:
    "Drag a contender onto a row, or select a card and click a destination. Drop onto an occupied row to swap. Draft mappings are saved in this browser.",
  [WORLDS_TEXT.scope]:
    "Curated abstractions with editable placements, including every cardinality from 1 through 256. Notes explain archetypes, creative compounds and WordNet specializations.",
  [WORLDS_TEXT.search]: "filter contenders",
  [WORLDS_TEXT.drop]: "drop association here",
  [WORLDS_TEXT.assign]: "assign selected contender",
  [WORLDS_TEXT.previous]: "previous",
  [WORLDS_TEXT.next]: "next",
  [WORLDS_TEXT.rows]: "cardinalities",
  [WORLDS_TEXT.mapped]: "assigned to",
  [WORLDS_TEXT.clear]: "unassign selected",
  [WORLDS_TEXT.selected]: "selected",
  [WORLDS_TEXT.none]: "none",
  [WORLDS_TEXT.empty]: "no matching contenders",
  [WORLDS_TEXT.tray_help]:
    "Drop a mapped card here to unassign it. All contenders remain available here, including assigned cards.",
  [KEY_GAMES_WORLDS]: "worlds",
  [KEY_GAMES_WORLDS_TITLE]: "all worlds",
  [WORDNET_TEXT.loading]: "loading abstract nouns...",
  [WORDNET_TEXT.error]: "Unable to load abstract nouns.",
  [WORDNET_TEXT.retry]: "retry",
  [WORDNET_TEXT.tree]: "abstract noun hierarchy",
  [WORDNET_TEXT.scope]:
    "The abstraction / abstract entity branch, including instance descendants. Shared concepts appear under each parent; this is a starting scope rather than a grammatical classification of every abstract noun.",
  [WORDNET_TEXT.count]: "synsets in this branch",
  [WORDNET_TEXT.synset]: "synset",
  [WORDNET_TEXT.children]: "direct descendants",
  [WORDNET_TEXT.license]: "license",
  [KEY_GAMES_WORDNET]: "wordnet",
  [KEY_GAMES_WORDNET_TITLE]: "wordnet reference",
};
