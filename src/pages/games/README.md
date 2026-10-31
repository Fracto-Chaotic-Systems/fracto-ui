# Games panels

The parent ../Games.jsx owns sidebar selection and the persisted splitter.
Sidebar order is Overview, separator, worlds, separator, wordnet, Settings, Status.
Overview, Settings, and Status intentionally remain blank.

- GamesWorlds.jsx coordinates the **all worlds** mapping table and searchable
  right-hand contender tray. It uses the existing StudyUtils pattern blocks
  at a 25px font size. Pattern blocks and factorizations are centered in their
  columns, including the column headings.
- GamesWorldsStyles.jsx owns the mapping table, association cells and panel layout.
  Table cells and mapping association cards use compact 0.25rem vertical
  padding; detailed contender cards retain their roomier spacing. The fixed table
  layout reserves 105px and 120px for the numeric columns; the association column
  uses one quarter of the remaining width (half its former balanced share),
  leaving the rest for notes. Association content wraps within that width.
- WorldsNotes.jsx renders each row's controlled editable notes; GamesWorlds
  coordinates browser-local overrides of database defaults.
- WorldsCard.jsx renders static rectangular sense cards.
  In the association column, cards display `word: short definition`, using the
  first semicolon-delimited gloss clause to omit examples. The word and colon
  are bold, with the definition continuing inline. The full gloss remains
  in the tooltip and the contender panel.
- WorldsMapping.js owns factorization and saved-state validation independently of React.
- WorldsFirstRound.js preserves the original 100-placement editorial proposal.
  WorldsGapFill.js adds 198 placements to fill all gaps from 1 through 256.
  WorldsCompounds.js adds the approved twenty compounds using existing primes.
  WorldsDraft.js preserves the historical browser seeding logic for tests; the
  active worlds page uses the database instead.
- WorldsContenders.js is a provisional alphabetical selection of 318 broad
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
4. Persist selected synset and expanded paths beyond explicit navigation links.
   The inner tree/details splitter now persists its width through AppSettings.
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
The table fetches GET `/wordnet_mappings` through DataBackend on mount, cancels
on unmount and exposes loading, error and retry states. WorldsDatabase.js validates
and indexes database rows independently of the contenders list. Database words,
short definitions and glosses render directly, even for senses outside that list.
The table shows every mapped database cardinality in ascending order. Pattern blocks and
prime-power factorizations are calculated from each database cardinality.

Associations remain read-only. The static contender tray stays searchable and its
assigned labels reflect database placements. Existing browser mapping and proposal
version settings no longer control the table. Local notes continue using the
existing notes setting, overriding database note defaults; clearing a note stores
an explicit empty override. Notes on unassigned rows remain editable. Browser edits
are not sent to the database. Existing saved notes are retained, including any
previously seeded note text. Database changes to such notes will be masked by those
local overrides until browser notes are cleared. Database failures never fall back
to a static proposal. Legacy proposal files and WorldsDraft remain for migration
provenance and historical tests, and are not imported by the page.

The proposal and verification sections below record historical behavior before
database integration, rather than the current persistence or interaction model.

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

## Approved twenty-compound expansion

WorldsCompounds.js adds 20 distinct senses at previously unused composite
cardinalities, including reconciliation 447, self-control 2911, gratitude 4117,
authority 7913, and loyalty 28891. Every factor uses an existing prime archetype.
The total is now 318 assigned contenders in a fresh draft; the original 298
placements and notes remain unchanged. Cards for all additions appear in the
alphabetical contender tray, and every addition includes an editable explanation.

A gaps-256-v1 saved draft receives only this compound layer; first-round-v1
receives the gap and compound layers. compounds-20-v1 prevents later edits or
removals from being reseeded. Existing user placements and notes win conflicts.
Tests verify that no new prime archetypes or reused source senses are introduced,
and that upgrading preserves edits and applies the twenty approved additions.

## Read-only associations

Direct reassignment controls and drag/drop handlers have been removed from both
the mapping table and contender panel. Cards are ordinary divs with no button,
toggle or drag semantics; their full-gloss tooltips remain available. The
assignment-selection status and unassign action are removed. Existing saved
notes are retained; placements now come from the database.
Earlier browser-verification notes above describe the historical interactive
prototype. Future semantic changes should be made to the database mappings
and explained in their notes rather than performed by moving cards.

## CSV download

The toolbar link downloads `wordnet-mappings.csv` locally. It exports all loaded
mapped worlds in numeric order, independent of paging and contender filtering.
Columns are cardinality (numeric in place of the visual pattern), factorization,
`word: short definition`, and notes including current browser edits. WorldsCsv.js
quotes fields and escapes quotes, retaining multiline notes and Unicode with a
UTF-8 BOM. The link is available after a successful load, including empty tables.

The area above the table contains only the italic `download CSV` link during
normal use. Introductory help, assignment count, assigned-only toggle and paging
controls have been removed. Loading and failure/retry feedback appear only while
needed. The page title and contender panel remain in place.

Formula values use a 1.1rem monospace font and can wrap within their column.

Theme cards render directly in table cells, without a white background wrapper
or its extra padding. Long theme text wraps within the card.

WorldsLayout has no horizontal padding or gap between the table and contenders
panel, allowing the table to fill the available content width.

The CSV toolbar aligns its link to the right with a 1rem right margin.

The all themes panel places its filter directly below the heading; introductory
scope and usage text are no longer displayed.

Detailed cards in the all themes panel show the assigned cardinality as a 20px
pattern block instead of assignment text; unassigned themes show no block.

Theme-card pattern blocks are keyboard-accessible buttons that smoothly scroll
the table to the assigned row, accounting for its sticky header. Only the table
scrolls; the theme panel stays in place.

## Theme links to WordNet

Theme-card synset IDs link to `/games?synset=ID`. Games selects the reference
sidebar item for this query and passes the ID to GamesWordnet. Selecting another
sidebar item clears the query so later links, including the same ID, reopen the
reference. Direct links and browser navigation use the same path.
WordnetTree.wordnet_selection finds one shortest root-to-sense path, using visited
IDs to handle shared ancestors safely. Its path keys expand each ancestor and
control tree selection; the sense details and selected tree item are revealed.
Missing IDs fall back to the abstraction root. The graph fetch is cancelled when
leaving the page. `test/wordnet_navigation.test.js` verifies all theme IDs can be
revealed in the actual graph and covers multiple-parent and missing-ID behavior.

Theme-card WordNet links appear inline at the end of the description, in
parentheses, rather than on a separate line.

## Reference detail ancestry and descendants

WordnetDetails.jsx shows breadcrumb steps immediately after the selected gloss,
using the actual selected occurrence path rather than choosing a different path
through multiple inheritance. Ancestors are clickable; the current entry is omitted. The root has no
breadcrumb list. A nested list below the breadcrumbs shows children, grandchildren
and great-grandchildren, with no fourth generation and no section for leaf senses.
Descendant labels select their occurrence and expand its ancestors in the main
tree. WordnetTree.wordnet_descendants owns the depth limit and avoids path cycles.

## WordNet detail to world navigation

WordnetWorldLink.jsx reads the database mappings once while the reference details
are mounted. A mapped sense displays a 20px pattern-block link just above the synset line;
unmapped senses omit it. Mapping failures provide retry feedback. No static
contender assignments are consulted. The link opens `/games?card=N`, selecting
all worlds. After database rows render, WorldsNavigation.scroll_world_row scrolls
only the table viewport, positioning the requested row below the sticky header.
The same helper handles theme-card pattern clicks. Sidebar changes clear unrelated
target parameters, so repeated links and browser navigation remain usable.

Pattern-block links into all worlds also reveal the mapped sense in the all themes
list. The list and table scroll independently after mappings load; senses absent
from the static theme list leave its position unchanged.

The reference detail panel starts with the selected entry title at 1.75rem.
Introductory taxonomy scope and total synset count are no longer shown above it.

The selected entry definition uses 1.25rem italic text.

The detail panel omits the direct-descendant count line; the descendant tree remains.

Synset and license metadata use margin-free lines to avoid a blank paragraph gap.

Breadcrumb chevrons use CSS Unicode escapes. The license line uses a plain ASCII
pipe separator to avoid encoding or font issues.

The breadcrumb section is headed “predecessors,” matching the descendant section heading.

Predecessors render as a vertical cascade, with each successive ancestor indented
an additional 0.75rem. Inline chevron separators are removed.

The entry title and definition are separated by a compact 0.35rem gap.

## Reference splitter

GamesWordnet owns the inner tree/detail geometry, measured with ResizeObserver.
It uses CoolSplitter in flow layout and persists tree width in the numeric
`games/wordnet_splitter_pos_px` AppSettings key, initially 450px. Both panes keep
180px where space allows. Resizing temporarily clamps the displayed width without
replacing the saved preference. The observer disconnects on unmount. WordnetLayout.js
holds the bounds calculation.

## World names

The table now reads card, formula, theme, name, notes. The theme column occupies
one eighth of the width remaining after the numeric columns (half its prior
width); name occupies one sixteenth, with the freed width allocated to notes.
Migration 005 initializes the database world_name field to `world N`; the page
and CSV export read it directly, preserving future custom names. Names are
read-only in this interface.
