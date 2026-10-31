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
    "breadcrumbs",
    "predecessors",
    "descendants",
  ].map((key) => [key, `${GAMES_FOLDER}/wordnet_${key}`]),
);
export const WORLDS_TEXT = Object.fromEntries(
  [
    "cardinality",
    "assigned_only",
    "assigned_worlds",
    "factorization",
    "name",
    "notes",
    "notes_placeholder",
    "save_notes_error",
    "reload_notes",
    "association",
    "unassigned",
    "contenders",
    "help",
    "scope",
    "search",
    "previous",
    "next",
    "rows",
    "mapped",
    "empty",
    "tray_help",
    "download_csv",
    "refresh",
    "show_card",
    "loading",
    "error",
    "retry",
  ].map((key) => [key, `${GAMES_FOLDER}/worlds_${key}`]),
);
export const APP_GAMES_TEXT = {
  [WORLDS_TEXT.show_card]: "show card",
  [WORLDS_TEXT.refresh]: "refresh worlds",
  [WORLDS_TEXT.download_csv]: "download CSV",
  [WORLDS_TEXT.loading]: "loading worlds...",
  [WORLDS_TEXT.error]: "Unable to load worlds.",
  [WORLDS_TEXT.retry]: "retry",
  [WORLDS_TEXT.assigned_only]: "show assigned only",
  [WORLDS_TEXT.assigned_worlds]: "assigned worlds",
  [WORLDS_TEXT.cardinality]: "card",
  [WORLDS_TEXT.factorization]: "formula",
  [WORLDS_TEXT.name]: "name",
  [WORLDS_TEXT.notes]: "notes",
  [WORLDS_TEXT.save_notes_error]:
    "Notes were not saved. Retry, or reload the server version if it changed.",
  [WORLDS_TEXT.reload_notes]: "reload server notes",
  [WORLDS_TEXT.notes_placeholder]: "add notes...",
  [WORLDS_TEXT.association]: "theme",
  [WORLDS_TEXT.unassigned]: "unassigned",
  [WORLDS_TEXT.contenders]: "all themes",
  [WORLDS_TEXT.help]:
    "Associations are curated in the database so changes can be considered together with their compound meanings. Notes are saved to the database when you leave the field.",
  [WORLDS_TEXT.scope]:
    "Curated abstractions with defined placements, including every cardinality from 1 through 256. Notes explain archetypes, creative compounds and WordNet specializations.",
  [WORLDS_TEXT.search]: "filter themes",
  [WORLDS_TEXT.previous]: "previous",
  [WORLDS_TEXT.next]: "next",
  [WORLDS_TEXT.rows]: "cardinalities",
  [WORLDS_TEXT.mapped]: "assigned to",
  [WORLDS_TEXT.empty]: "no matching contenders",
  [WORLDS_TEXT.tray_help]:
    "All contenders are listed with their assigned cardinalities. Use the filter to find a word or definition.",
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
  [WORDNET_TEXT.predecessors]: "predecessors",
  [WORDNET_TEXT.breadcrumbs]: "taxonomy path",
  [WORDNET_TEXT.descendants]: "immediate descendants",
  [WORDNET_TEXT.license]: "license",
  [KEY_GAMES_WORDNET]: "wordnet",
  [KEY_GAMES_WORDNET_TITLE]: "wordnet reference",
};
