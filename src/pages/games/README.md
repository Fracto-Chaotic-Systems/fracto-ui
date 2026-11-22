# Games panels

The parent ../Games.jsx owns sidebar selection and the persisted splitter.
It gives the play pane full height so GamesPlay's flex content area can fill the
space below the title without clipping the gear or drawer to a zero-height box.
`GamesPlay` gives that content area a light silver brushed-metal background, using
layered CSS grain, scratches, and soft highlights beneath the flight scene,
TV, instruments, and controls. The same finish carries into fullscreen. The
settings gear uses a dark color for contrast over both the metal and the open drawer.
Sidebar order is Overview, separator, worlds, music, play, separator, wordnet, Settings, Status.
Overview, Settings, and Status intentionally remain blank.

## Corner CRT character

The transparent TV canvas casts a dark, diffuse CSS drop shadow from its alpha
silhouette, offset 10px right and 16px down with an 18px blur. It follows the
cabinet and rig as they move without adding an opaque backdrop or scene walls.
The glass finish includes a subtle cool-white oval reflection in its upper left,
composited over every screen source and mapped to the curved glass as it moves.

`CrtStaticFlash.js` gives each intermittent static burst a 35% chance of a
single-frame `Husker Du` title card near its midpoint. Large off-white lettering
appears on a dark screen, then static resumes. At the display's 24 fps cadence
the card lasts approximately 1/24 second. It remains below the independent
broadcast strip and is suppressed under reduced motion. Burst identifiers and
durations come from the interference scheduler, so media changes cannot cause
repeated flashes within one burst.

`CrtBroadcast.js` paints a vintage monospace alert strip over all screen content,
including static, before the glass finish. Its independent screen-lifetime
clock scrolls bold 32px monospace AppText lettering in a 46px-high strip
aligned to the screen's bottom edge, right to left in white on blue at 127.5 texture
pixels per second. After the complete message exits, a centered red-on-white
`PREPARE TO DEPLOY` blinks for six seconds, then the sequence repeats. Media
changes do not reset it. Reduced motion keeps the alert lettering steadily visible.
Successive crawls alternate English and a randomly chosen AppText translation:
Spanish, French, German, Russian, Greek, Arabic, Hindi, Japanese, Chinese,
Korean, Esperanto, or Latin, plus a deliberately nonsensical lorem ipsum variant with the English
message's sentence cadence and punctuation. Its blinking alert reads exactly
`anim id est laborum`. Consecutive translated turns avoid repeating the same option. Each
message is measured separately so the full text exits before the alert begins;
Arabic is shaped right-to-left and enters from the left for reading order.
Unicode font fallbacks cover the additional scripts. The deployment alert uses
the preceding crawl's language and text direction, with centered text fitted
inside the strip. Language selection never resets or waits for the media playlist.

`CrtImageReveal.js` calculates focal-point zoom-out framing for image layers.
The playlist gives `Image3.jpg` an 18–24 second reveal from its upper blank face
to the entire image, with brief holds at the start and finish. Other images keep
their existing framing and portrait scans.

`GamesPlay.jsx` places `GamesCrt.jsx` in the upper-left corner of `PlayContent`,
below the Game Play title, so it stays inside the content area in fullscreen and
unmounts when leaving Play. The sidebar contains navigation only. The corner
overlay scales from 425 to 725px, exactly 25% above the prior sizing, including
its responsive cap. The whole overlay is offset 50px left; the content boundary
clips the elbow when it extends past the edge. The transparent canvas can extend
beyond the content width, and camera framing reduces transparent padding.
It passes pointer events through except
on its clickable TV screen; the settings drawer renders above it. It owns a
small Three.js scene, observers, pointer tracking, and its extend/retract control;
it does not change the selected panel or persist poses. `CrtModel.js` builds the
ceiling bracket, paired metal arms, cradle, rounded vintage cabinet, and convex
CRT glass. `CrtMotion.js` owns the constant-length two-link inverse kinematics,
swivel, pitch, inquisitive roll, and cable movement. Pointer tracking
is page-wide; clicking the glass toggles extension and retraction. An invisible
native button follows the projected rounded-glass silhouette every rendered
frame, so transparent surroundings do not intercept gameplay clicks. The same
control supports Tab, Enter/Space, a screen-reader label, and a visible focus tint.
The head's resting yaw faces the viewer's right relative to the angled camera;
pointer tracking adds a bounded swivel around that pose.
The WebGL canvas and its wrapper are transparent, with no wall or ceiling
surfaces. On resize, camera framing aligns the stationary bracket with the very
top edge of the gameplay content, independently of the animated head pose.
Both neck poses hold the TV higher, close beneath the top bracket; the elbow
folds to reach the raised wrist while retaining both arm lengths.
The wrist follows a mounting plate behind the cabinet as the TV swivels and
tilts. The elbow folds to the left and rear, making the mechanism visible beside
the cabinet while keeping both links behind its shell throughout retraction.
Camera framing leaves room beside the TV for the elbow and paired links; the
overlay's left offset intentionally allows them to be clipped at the page edge.

`CrtCables.js` adds two flexible leads fixed at the ceiling bracket and plugged
into rear sockets on the moving TV. Their slack loops hang below the cabinet,
with gentle damped sway and extra slack on retraction. Tube vertex buffers are
updated in place at the scene's paint rate; reduced motion disables sway. Cable
meshes and socket materials share the scene's normal disposal lifecycle.

`CrtCasing.js` generates the cabinet's aged ABS finish once at initialization:
uneven yellowing, mottled dirt, grime along panel edges, fine molded grain, and
small scuffs. Separate color, bump and roughness maps keep the case matte while
the CRT glass stays glossy. The dark bezel shares these maps with its own tint;
scene disposal releases the shared textures once. No image assets are fetched.
`CrtVents.js` adds six horizontal cooling slots on each side of the cabinet,
including its visible left side. Dark inset faces, grime rims and molded lower
lips give the slots depth under the scene lighting and share the aged shell finish.
`CrtArmature.js` gives the ceiling plate, links, joints and cradle a matching
gritty industrial finish: pitted metal, scratched paint, dark grime and small
rust patches. Shared color, bump, roughness and metalness maps are generated
once and disposed with the scene; corroded patches have reduced metallic shine.

The screen has a context-driven compositor for images, video, custom canvas
animation, face/static layers and combinations. The default blinking face briefly
changes to static at irregular intervals. Game Play defaults to a shuffled
playlist of images and MP4s in `public/screens`, with face interludes and brief
static. Every source shares the moving glass's
texture/UV mapping. Portrait images zoom into the top and smoothly pan to the
bottom across their display slot, with brief holds at either end. See
[CRT_SCREEN_CONTENT.md](CRT_SCREEN_CONTENT.md) for the
descriptor API, media ownership, timing, reduced motion and verification fixture.

Animation and screen painting are capped at 24 fps, pause while hidden/offscreen,
and honor reduced motion with immediate user-driven poses and no idle animation.
Unmount releases GPU resources, observers, and listeners. A localized message
replaces the scene if WebGL initialization fails. No model downloads are needed.
Run `node --test test/crt_mount.test.js` from the UI folder for the full arm travel
and convex-glass checks. `/scripts/crt_preview.html` previews the production
component independently of authentication and backend service discovery.

Game Play now renders flight over the flat tiled complex plane beneath the
dashboard. Its worker handles ray projection, local adaptive tile refinement,
whole-frame coloring and bounded calculation fallback. Canvas resolution adapts
to frame cost while the page and instruments retain their measured layout. See
`flight/FLIGHT_OVER_TILES.md` for the specification and `flight/README.md` for
state, rendering, lifecycle and verification details.

`GamesPlayControls.jsx` arranges selected flight instruments around the centered
on-screen controller at the bottom of the game area. `GamesPlayMap.jsx` positions
the parchment chart relative to that dock, with a -65px vertical offset.
The whole parchment rotates about its center toward the negative of the live
attitude roll angle. `ParchmentMotion.js` uses a gently damped spring so it lags behind attitude
changes and settles gradually with slight inertia, generally over 2–3 seconds.
It takes the shortest angular path across ±180°. A per-map telemetry subscription
updates the target, and animation updates a CSS variable without redrawing the
raster. Animation stops after settling or while hidden, and reduced motion
applies the target directly. Frame callbacks and subscriptions are released on
unmount.
`ParchmentSuspension.jsx` adds a fixed metal nail centered slightly above the
wooden knobs and a textured twine loop layered behind the parchment. The nail
sits at 10% of the frame height. String ends extend to the wooden handles at
10% and 90% of the frame width, both at 17% of its height.
`ParchmentSuspension.js` rotates the two attachment
points on the wooden handles around the map center. The string's
straight spans update with the displayed spring angle, staying taut and attached
while the nail remains stationary. Both the parchment and its fittings keep the
existing dock placement and vertical offset.
Airspeed, attitude, and
heading default to the left; altitude, vertical speed, and turn coordination
default to the right. Desktop instrument groups sit directly beside the controller
without a horizontal gap. Below 768px the groups stack above the controller in rows
of up to three. Settings → **display** → **dashboard background** switches between
woodgrain, brushed metal plate, woven wicker, and mother of pearl. The finish applies live and
persists under `games/play_dashboard_background`, defaulting to woodgrain for
invalid saved values. `DashboardBackground.js` layers local CC0 texture color
maps from `public/dashboard/` beneath the lighting and polished rim. The 1K WebP
assets total about 177 KiB; their README records sources and licensing. Woodgrain
uses the lighter Poly Haven Oak Veneer 01 diffuse map. Texture
tiles retain fixed scales when the panel resizes, without stretching the weave.
Mother of pearl uses a locally bundled public-domain iridescent image, oversized
without tiling. Only this image layer drifts edge-to-edge on a 45-second traversal.
It smoothly reverses at the image boundaries (0% and 100%) without exposing gaps;
controls, lighting, and rim stay fixed. Reduced-motion preferences disable drift.
Metal uses ambientCG Metal 011 with a broad reflected highlight sweeping across
the surface on a 32-second alternating cycle. The texture, rim, and controls stay
fixed. Night flight lowers the highlight intensity as well as dimming the surface;
reduced-motion preferences keep the highlight stationary.
`useDashboardBackground.js` shares the preference between the dock and selector.
`NightFlightSwitch.jsx` adds a keyboard-accessible vintage lever switch to the
left of the heading indicator, using the unused half-cell beside the centered
last dial. The 54 × 72px switch scales down when needed, without adding a gutter
to the upper instrument row or widening the dashboard shoulder. Its photographic
sprite uses the supplied left switch for off and
right switch for on, with transparent surroundings. The image states retain
their ON/OFF lettering and the button keeps its keyboard and switch semantics.
The compact **LIGHTS** plate sits directly below the switch, independently of
the heading caption. `DashboardNameplate.js` shares the riveted metal finish and
night illumination with instrument captions; the switch plate fits its text plus
an extra 1rem of width. The switch and plate are offset together 0.5rem to the right.
If a custom layout or compact row leaves no spare half-cell, or the heading is
hidden, the switch remains available beside the controller's upper-left area.
`useNightFlight.js` shares the persisted `games/play_night_flight` preference.
Night flight dims the dashboard surface/rim, controller and LED display, while
warming and softly illuminating dial text, white markings/needles, and nameplates.
Warning arc colors and flight state remain unchanged. Toggling restores day colors.
A shared dashboard surrounds the instruments and
controller, with a reflective metal rim and light instrument labels. The centered
panel hugs the selected controls' combined width, with circular shoulders sized
to the instrument radius plus side clearance, following the outer dials just above
the trigger buttons. Each side includes an extra 1rem of wood beyond the original
rim clearance, and straight sides extend to the bottom edge without lower corner
curves or a bottom trim. Status text sits above the panel
without reserving empty dashboard space; hidden instruments do not leave empty side panels. Its decorative
surface extends into the dock's existing outer margin without adding gaps between
the controls or intercepting pointer input. Settings → **instruments** controls visibility, selection,
left/right placement, size, ranges, airspeed/pressure units, and animation.
Preferences persist in AppSettings under `games/play_instruments`; resetting
instrument defaults leaves other gameplay settings unchanged.
If available space would reduce gauges below 48px, instruments temporarily give
way to the controller and a resize hint, recovering automatically when space
returns. Saved visibility and placement preferences are not changed.
`GamesPlayControlsLayout.js` uses the game area's measured bounds to fit both
normal and fullscreen views while leaving room for settings. Instrument groups
ignore pointer input; the controller retains its own touch targets and help boxes.
GamesPlay owns a separate immutable flight-state store. The instrument groups
subscribe directly, so telemetry updates do not rerender the controller or page.
The current game starts in level flight and a time-based simulation publishes
live telemetry from mapped controls. See [flight/README.md](flight/README.md).

GamesPlay also owns a separate mapped flight-command store bound to controller
input and saved preferences from an effect. Settings → **control** supports
button/axis assignments, axis and pitch inversion, dead zone, sensitivity, and
reset. The help overlay subscribes to effective commands, so labels follow the
current assignments. `FlightSimulation.js` consumes continuous commands from an
animation-frame loop, pauses when hidden/unfocused, and cleans up on page exit.
Default stick movement banks/changes speed, the D-pad controls attitude, and
triggers change speed; bank/pitch produce turn and climb/descent readings.
See [controllers/README.md](controllers/README.md).

- GamesPlay.jsx renders the **game play** title above a flex content area, with a
  gear icon in that area's upper-right corner and the tooltip **settings**.
  Clicking it toggles a persistent Material UI drawer that slides in from the right
  with a **Settings** heading. The same button stays above the drawer and changes
  to an **×** with a **Close settings** tooltip while open. The drawer is positioned
  within the content area
  below the title bar. It has no backdrop or focus trap, so the rest of the page
  stays undimmed and interactive.
  Its left edge uses the standard vertical CoolSplitter in flow layout, beside
  the Settings content inside the drawer, which has 0.5rem padding. It constrains the drawer width to
  5%–50% of the content width, with a default width of 30%. CoolSplitter owns mouse
  dragging and drag feedback; GamesPlay converts its pixel position to a fraction.
  GamesPlay measures the content with ResizeObserver and persists the splitter
  fraction in AppSettings under `games/play_settings_position`, so resizing the
  content retains the selected proportion. The stored fraction measures the left
  edge from the content area's left side (0.5–0.95, default 0.7). Existing saved
  positions are restored within these bounds; legacy -1 values use the new default.
  GamesPlaySettingsLayout.js owns the pure
  default/bounds calculations.
  The close icon or Escape while focus is inside the drawer dismisses it and
  restores focus to the gear. Clicking outside the drawer also closes it while
  preserving focus on the clicked control. Portaled settings menus count as
  inside the drawer, and the gear continues to toggle it. GamesPlay owns the
  drawer's open state.
- GamesPlaySettings.jsx owns the drawer's collapsible settings sections. The
  first section, **display**, starts collapsed and reveals a **full screen**
  switch when expanded.
  Active button and stick descriptions are always enabled between the controller
  halves. There is no controller-actions toggle; old saved preferences are ignored.
  The **controller color** dropdown offers green, red, orange, white, violet,
  blue, pink, yellow, black, and grey. It defaults to blue and persists through
  AppSettings (`games/play_controller_color`). Each scheme keeps the shaded shell,
  highlights, rim, and shadow; selections update live without remounting the pad.
  A **control** section follows **display**, using the same collapsible
  section styling and starting collapsed. Its **device** dropdown offers
  **on screen** (default), **keyboard**, and **hand held**, saving the selection
  through AppSettings (`games/play_controller`). The dropdown has 0.375rem vertical
  and 0.5rem horizontal padding. Unknown saved values fall back
  to **on screen**. The on-screen device mounts virtual-gamepad-lib through the
  replaceable controller adapter in `controllers/`; changing to keyboard or hand
  held removes it and clears input. Those two input providers are not implemented
  yet. See controllers/README.md for the normalized input contract and lifecycle.
  The section title and toggle label share a 1.25rem indent, reserving space for
  the section's disclosure chevron and keeping their text aligned. The chevron
  points right when collapsed and down (v-shaped) when expanded.
  GamesPlay passes a ref to the game area (right of the sidebar splitter and below
  the title) as the Fullscreen API target. Only that area fills the screen;
  navigation, sidebar, and page title remain outside fullscreen. The game area's
  `:fullscreen` styles fill the viewport, while normal styles resume on exit.
  Settings stay inside the fullscreen target so the toggle remains available.
  The switch reflects this target's actual state, including exits with Escape, and
  records confirmed changes through AppSettings (`games/play_full_screen`). A saved
  true value does not automatically re-enter fullscreen after reload because the
  browser requires a user gesture. Requests disable the switch until settled;
  unsupported browsers and rejected requests show localized status text. The
  fullscreenchange listener is removed when the settings component unmounts.

- GamesMusic.jsx renders **All Music** with Open MIDI, Play, Stop, filename,
  playback position, status, errors, file warnings, and a zoomable track/channel
  viewer with aligned labels, audio-clock playhead/highlighting, event lanes, and live mute/solo/volume/pan
  controls for the selected route. FluidR3 GM is fixed in the player hook; there
  is no library selector or refresh button. The music/ modules own
  MIDI parsing, audio scheduling and lifecycle cleanup.

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
- WorldsNotes.jsx renders compact, scrollable Markdown previews with an edit
  control for raw Markdown. A reserved 28px rail inside the notes cell stacks
  expand/collapse above a mode-switch icon, both with accessible labels. The mode switch
  shows only view (eye) while editing or edit (pen) while viewing.
  Switching to view saves the draft; expanding retains the current mode.
  Expanded previews reveal the full note with at least a viewport-sized height,
  while editors grow to the available viewport height. GamesWorlds measures the
  viewport and scrolls only the table to the row beneath its sticky header after
  expansion. Collapsing restores the compact height. Expansion is local UI state,
  not a database edit. Moving focus to rail controls does not trigger blur-save. Leaving the editor saves through the existing
  expected-value API; failed saves retain the draft and retry/reload controls.
  useWorldsData owns server loading and saving. The shared MarkdownDocument
  renderer supplies the same typography as admin/reference, including distinct
  heading sizes, lists, links, code and tables. Raw HTML is skipped and links open
  separately with safe URL handling. NotesPreview extends the shared document
  with scrolling, height, a white background and 0.5rem padding. Mapping-table selectors target direct cells
  so they cannot override tables embedded in Markdown. CSV retains Markdown source.
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

World names are now discussed case by case, favoring significant literary and
cinematic references from mystery, science fiction and fantasy, including Harry
Potter, LOTR, Star Trek and Star Wars. Fictional institutions, characters, objects
and motifs may supply names when their narrative role connects to the theme.
Historical places, general settings and abstract worlds are equally available.
Prefer variety across franchises and retain provenance, variants and preference
order in database notes; naming suggestions do not adopt a name or implement
a proposed gameplay mechanic.
See [the naming philosophy and unapproved examples](../../../../../database/seeds/README.md#current-naming-philosophy-literary-references-one-world-at-a-time)
for the authoritative guidance. Keep world N until that individual name is chosen.

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
version settings no longer control the table. Notes come exclusively from the database. Editing creates only a temporary
in-memory Markdown draft; leaving the field saves it through the notes API with the original
server text as an optimistic concurrency check. Failed edits remain visible with
retry and reload-server controls. No notes are saved in AppSettings or localStorage;
obsolete note cache keys are removed when the page loads. Returning focus to the
page refreshes database entries. CSV exports use committed database notes.
Database failures never fall back
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
`word: short definition`, and committed database notes. WorldsCsv.js
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

The table reads card, formula, theme, name, notes. Theme uses 20% of the table
width and name uses 10%, giving them a 2:1 ratio. Notes take the remaining width
after the fixed numeric columns.
Migration 005 initializes the database world_name field to `world N`; the page
and CSV export read it directly, preserving future custom names. Names are
read-only in this interface.

## Unapproved name proposals

Migration 006 appends a section to every database note with 1-2 candidate world
names and brief reasons. The name column stays `world N` pending individual
approval. Existing compound explanations remain above the suggestions.
The proposal is stored only in the database. The former browser override and
proposal-merge mechanism has been removed; later API edits take precedence.

Theme and name use direct percentage widths for reliable fixed-table sizing,
with wrapping for long names. Notes fields initially show three text rows.

## Database-only note editing

useWorldsData.js owns requests, focus/visibility refresh and write/read race guards.
WorldsNotesData.js validates saved responses and removes the two obsolete storage
keys. WorldsNotes.jsx keeps only an unsaved in-memory draft and saves on blur.
PUT /wordnet_mappings/:cardinality/notes accepts notes and expected_notes; it
reuses the transactional editor and checks the configured UI origin, alongside
normal service authentication. A conflict never overwrites a newer server edit.

A circular-arrow button immediately before download CSV reloads mappings and notes
from the database. It shows a busy state during refresh; the table and CSV then
use the latest committed values.

CSV download is an icon link with a download CSV tooltip and accessible label.

## Browser world references

WorldsReferences.js decorates parsed notes prose references (`#68`, `world 68`, or `world #68`) for cardinalities present in the table, excluding existing links and code. Clicking expands destination notes and scrolls the table after layout. Repeated clicks re-expand collapsed destinations. Saved Markdown, drafts and CSV remain unchanged.

When the referenced number is followed by its database theme label, the entire reference (for example `#17 space`) forms one link. Matching is case-insensitive with a word boundary, so unrelated following prose is not included.

## Planned MIDI playback

See [MIDI_IMPORT_PLAN.md](MIDI_IMPORT_PLAN.md) for the legacy source review,
minimal playback scope, required corrections and verification sequence.

Step 1 results are recorded in [MIDI_VERIFICATION.md](MIDI_VERIFICATION.md):
verified sample coverage/CORS/browser decoding, parser compatibility, and
required metadata and malformed-input handling before playback integration.

Step 2 is implemented in [music/](music/README.md): the plain JavaScript MIDI
adapter validates local bytes and produces a channel-aware note timeline with
tempo changes and sustain. The audio controller, sample cache and scheduler
are connected to All Music through useMidiPlayer. File bytes stay local; the
player fetches only the needed piano samples. Leaving the panel disposes its
audio context. See music/README.md for supported files, sample limits and
error/retry behavior.

## Planned track and instrument interface

[MIDI_TRACK_INTERFACE_PLAN.md](MIDI_TRACK_INTERFACE_PLAN.md) maps the legacy
track display and placeholders to a staged viewer, mixer and instrument-provider
extension. Steps 1–4 now supply immutable metadata and a pure track/route
summary helper, plus a pane-local viewer with timeline, strips, zoom, sticky
labels, a synchronized playhead, highlights and tempo/meter/pedal lanes.
The selected route has a working mixer and Reset mix restores all routes;
additional instrument assignment remains planned.

All Music offers per-route instrument assignment, with original file programs/banks
separate from effective sound. FluidR3 GM supplies original assignments; the
explicit GrandB piano (Legacy) override remains available. See music/README.md.

Interface step 6 automated checks pass (79 MIDI tests and 190-file compatibility corpus). The expanded real-browser verification remains pending tool access; see MIDI_VERIFICATION.md.
