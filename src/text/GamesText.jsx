const GAMES_FOLDER = "games";

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
export const APP_GAMES_TEXT = {
  [WORDNET_TEXT.loading]: "loading abstract nouns�",
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
