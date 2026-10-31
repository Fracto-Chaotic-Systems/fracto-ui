# Games panels

The parent ../Games.jsx owns sidebar selection and the persisted splitter.
Sidebar order is Overview, separator, wordnet, separator, worlds, separator,
Settings, Status.
Overview, Settings, and Status intentionally remain blank.

- GamesWorlds.jsx coordinates the **all worlds** mapping table and searchable
  right-hand contender tray. It uses the existing StudyUtils pattern blocks.
- GamesWorldsStyles.jsx owns the mapping table, drop targets and panel layout.
- WorldsNotes.jsx renders each row's controlled editable notes; GamesWorlds
  coordinates persistence. Notes stay with the cardinality when cards move.
- WorldsCard.jsx renders draggable, keyboard-selectable rectangular sense cards.
- WorldsMapping.js owns factorization, saved-state validation, move/swap and
  unassignment rules independently of React.
- WorldsFirstRound.js preserves the original 100-placement editorial proposal.
  WorldsGapFill.js adds 198 placements to fill all gaps from 1 through 256.
  WorldsDraft.js applies these versioned layers while preserving existing row
  assignments, moved contenders and user notes.
- WorldsContenders.js is a provisional alphabetical selection of 298 broad
  WordNet senses with potential for creative compounds, not numeric assignments.
  Labels distinguish the intended sense; full source glosses and IDs remain
  available. This is an editorial starting list, not a ranking or exhaustive set.
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

## Worlds creative direction

The mapping is curated and allows creative interpretations of composite
abstractions. The initial focus is the fundamental denominators, assigning
more prominent and connectable archetypes to lower numeric values.
WordNet's is-a relationships can supply more specific versions of a base
archetype for related values such as 2, 4, and 8.
A later layer will add fractional aspects: an entity assigned denominator 5
will have four aspects represented by 1/5, 2/5, 3/5, and 4/5.
The first visit applies the first-round proposal to available rows. The default
assigned-only view shows every mapped cardinality in ascending order, including
sparse large compounds. Turn off show assigned only to browse all cardinalities
in pages of 64 starting at 1. Factorization uses prime powers; 1 is shown as
1, the empty product. Rows are numeric denominator slots, not assertions that
specific orbital components have been detected. Fractions are not implemented.

Drag a contender onto a mapping row to assign it. Moving a mapped card to an
occupied row swaps the two; assigning an unassigned contender replaces that
row's card, which remains in the tray. All contenders remain listed, with their
current assigned row shown. Dropping a card into the tray unassigns it.
Cards can also be selected with click/keyboard and assigned with the destination
button. Unassign selected provides a keyboard alternative to the tray drop.
A contender has at most one mapped cardinality. Selection and filtering are
transient. The {cardinality: synset_id} draft and a separate
{cardinality: note_text} notes map are persisted through GamesSettings/AppSettings
in browser storage. They begin as empty settings and receive the proposal once
when the worlds page mounts. The fourth table column, notes, is
editable even on unassigned rows. Clearing a note removes its saved entry. Unknown IDs,
invalid cardinalities and duplicates in restored settings are discarded.
Run node --test test/worlds_mapping.test.js for factorization, move/swap,
restore validation and exact contender-to-source consistency tests.

Browser verification used a temporary isolated component harness because the
running Compose UI served an earlier source snapshot and the standalone app
could not complete cross-origin service discovery. Verified contender drag to
a row, card movement between rows, keyboard/click unassignment and reload;
the test mapping was returned to empty. No backend service changes were made.

## First-round proposal

Existence occupies 1, the shared ground. The reusable prime archetypes are:
2 relation, 3 change, 5 knowledge, 7 value, 11 quantity, 13 time, 17 space,
19 action, 23 emotion, 29 possibility, 31 attribute, 37 intention, 41 power,
and 43 identity (exact sameness rather than personal identity).
Prominence and compound usefulness drive the low prime assignments;
independence of these archetypes is a creative convention, not a linguistic claim.

Examples: 15 learning = change x knowledge; 65 memory = knowledge x time;
115 empathy = knowledge x emotion; 529 love = emotion squared, a WordNet
specialization. The nine prime-power placements have verified WordNet subtype
paths. In particular 5 -> 25 -> 125 follows knowledge -> belief -> expectation.
Other products permit metaphors, counterpoints and broader interpretations,
which are explained individually in their editable notes. A power used inside
a compound can refer to its assigned subtype, such as potential at 29 squared.
Some compounds are large (up to 17329 for state); assigned-only view makes them
reviewable without walking through empty cardinalities. This is a first-round
creative proposal rather than a claim of optimal or canonical decomposition.

The saved worlds_draft_version prevents cleared notes or removed placements
from reappearing on reload. On initial application, existing placements and
notes win conflicts; a displaced proposal entry is left unassigned rather than
overwriting a user choice. Notes remain attached to rows when cards are moved;
users should revise any explanation affected by a later reassignment.
Run node --test test/worlds_draft.test.js to check full coverage, factor arithmetic,
prime-power ancestry, preservation of manual edits and one-time application.

First-round browser verification (isolated component preview): all 100 mapped
rows and explanations rendered; an edited note survived reload and was restored
to the proposal text afterward. Switching assigned-only off showed the complete
1-64 page and switching back restored all 100 assignments. The temporary preview
files and server were removed after verification.

## Gap expansion through 256

The second proposal adds 198 distinct WordNet senses, one for every formerly
empty cardinality from 1 through 256, while retaining the original 100 rows
and their explanations unchanged (including their larger cardinalities).
There are 298 assigned contenders in a fresh draft, all listed in the right tray.
New primes introduce additional reusable archetypes; products describe creative
combinations of their factors. Every new row has an explanatory note.
New power entries explicitly distinguish verified ancestry from creative family
placement. They need not form a strict subtype chain through every intervening
power: correlation at 8 is a relation, not a subtype of causality at 4.
Goodness at 49, period at 169, and devastation at 243 are identified as creative
family placements because their selected synsets are in other WordNet branches.

An existing first-round-v1 browser draft receives only the new gap layer.
Existing placements and notes win conflicts; deliberately removed original
entries or cleared original notes stay removed. gaps-256-v1 marks completion
of the expansion so subsequent edits are never reapplied on reload.
Tests cover continuous 1-256 coverage, uniqueness, source senses, all factor
arithmetic, original-proposal preservation, incremental migration, user conflicts,
and the accuracy of the new power-entry ancestry claims.

Gap-expansion browser verification: the existing first-round local draft upgraded
to 298 assigned worlds and 298 contenders. All cardinalities 1-256 were present
in the rendered table; reload retained new notes and the original learning note.
The isolated preview files and temporary server were removed afterward.
