# Games panels

The parent ../Games.jsx owns sidebar selection and the persisted splitter.
Sidebar order is Overview, separator, wordnet, separator, Settings, Status.
Overview, Settings, and Status intentionally remain blank.

- GamesWordnet.jsx fetches the static graph on mount, cancels on unmount,
  exposes loading/error/retry states, and coordinates tree and synset details.
- WordnetTree.js adapts the graph to CoolTree. Only expanded branches are
  materialized. Path keys distinguish multiple occurrences of a shared synset;
  metadata.synset_id identifies the underlying canonical record.
- GamesWordnetStyles.jsx owns the tree/details layout.

## Conversion scope

The initial scope is the WordNet 3.1 abstraction / abstract_entity synset
00002137 and its hyponym and instance-hyponym descendants: 39,956 synsets.
This is a taxonomic starting point, not a definitive grammatical filter for
abstract nouns. Synsets represent specific senses; identical spellings can
have other senses elsewhere. Multiple inheritance is retained as a graph,
with shared concepts displayed beneath each parent in the tree.

The converter lives in ../../../scripts/wordnet-convert.js relative to this
folder (see the UI scripts README for the command). The generated asset is
public/wordnet/abstract-nouns.json, with schema_version, source, root,
node_count, license and an ID-keyed nodes map. Each node contains words,
gloss, lex_file, children and parents. Parent references can point outside
this branch; the current details view does not attempt to navigate them.
The original dictionary remains untouched. The source license is embedded
and shipped separately with the data. Regeneration is deterministic.

## Next steps

1. Review the abstraction branch against the desired meaning of abstract noun;
   decide whether to exclude instances or select narrower categories.
2. Add full-graph lemma/gloss search with ancestor paths so results can reveal
   their location. CoolTree's local search alone would miss collapsed branches.
3. Add parent navigation and relation types, including references outside the
   branch, without merging distinct word senses.
4. Persist selected synset and expanded paths; introduce a resizable inner
   splitter if the tree/details layout needs adjustment.
5. If the static payload grows beyond this prototype, serve indexed children
   and synset endpoints or partition the asset, preserving canonical IDs.

Validation: node --test test/wordnet.test.js, targeted ESLint, and npm run build.
The parser and graph adapter have fixture tests plus integrity checks against
all generated descendants. A browser smoke test should cover deep expansion,
selection, long definitions, failure/retry, and scrolling.
