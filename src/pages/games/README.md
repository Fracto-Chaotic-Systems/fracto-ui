# Games panels

## First-person walk on the construction stage

The stage's **Walk** button switches the orbit camera to a first-person explorer
for studying an environment at human scale. Click the stage to capture the mouse
(pointer lock); Esc releases it, and choosing Walk again restores the exact orbit
view. Controls: mouse looks, WASD/arrows move (1.4 m/s), Shift runs (4.2 m/s),
Space jumps (about 0.6 m), F toggles flying, with E/Q to rise and sink (4 m/s,
×3 with Shift). Eye height is 1.7 m and the field of view is 70°.

`ComponentStageWalk.js` owns the walker. Its pure `step_walk`, `look_walk` and
`walk_spawn` functions hold the movement rules; `create_walk_controller` adds
keyboard, pointer-lock and mouse input; `create_floor_probe` reads height only
from the authored floor mesh (`component_item_id === "floor"`). It takes a getter,
because the stage replaces its content group on every rebuild. Without a floor,
or beyond its edge, ground level is 0. Plants and props do not lift or block the
walker yet; collision belongs to the future engine package. Walking starts inside
the construction's edge, on the side the orbit camera was viewing from, facing
the centre. `ComponentStageScene.js` drives walking and clip animation from one
animation-frame loop, hides the grid/axes and selection highlight, and disables
selection clicks while walking. Hiding the stage, fitting the construction or
disposing it leaves walk mode. The module has no React or UI-framework
dependencies so it can move into a dedicated engine package later.

Tests: `test/component_stage_walk.test.js` covers movement direction and speed,
diagonal normalization, jump and floor following, flying clearance, pitch clamping,
spawn placement and the floor-only probe.

ComponentStageLightingControls places the materials-style light direction and
intensity sliders on the Stage / Construction document button row above the
workspace. Each control is 20rem wide; the row scrolls horizontally when the
available width cannot fit both controls and buttons. They edit `document.lighting`
through the existing editor history and Save component flow; variants inherit
the base lighting. New documents store 45° / 3 defaults and legacy documents
resolve those values until edited. Direction spans 0–360° (step 5°), intensity
0.25–6 (step 0.25). ComponentStageLighting applies the same light position
convention as InventoryScene. Lighting-only edits render immediately without
reloading materials, resetting animation or changing stage geometry.

ComponentStageShadows enables filtered directional shadows onto the textured
floor and placed materials. Shadow coverage follows the visible component region
as the camera pans, zooms or rotates, and follows the saved light direction.
Close views retain the thin sparse-grass shadows that disappear when one map is
spread across the full 20-metre floor. Coverage includes offscreen casters within
the full plant-height shadow reach; overview views still cover the visible strip.
Shadow resolution is capped at 4096 and the GPU texture limit. Animated meshes
cast from their current poses. Native alpha masks are retained; blended foliage
uses a shadow-only alpha cutoff so transparent cards do not cast solid rectangles.
Per-clone depth materials and the light's shadow map are disposed with the stage.

Component creation now follows collaborative authoring with maintained,
role-based construction descriptions. See the data service's
`components/blueprints/README.md` for the workflow and complete grass-strip
description. Construction document in the editor provides formatted Read and
Markdown Edit views of the saved description. Save component, reload, dirty-state
warnings and undo/redo include the text; description-only edits do not rebuild
geometry. Structured blueprint/server ingestion remains future work.

Representative construction evaluation covers geometry, counts, path clearance,
refinement, history and real MySQL roundtrips. Live plain-floor, wooded-path and
dense grass-strip builds now pass after latency and catalog fixes; see the AI
service's construction/EVALUATION.md for measured results and remaining limits.

The stage's right-hand panel now lists variants for the open component. It reads
`GET /api/component-documents/:id/variants` through the existing thin data-service
proxy. Names and overrides are shown, with loading, empty, error and retry states.
Requests are cancelled on component changes and stale results are discarded.
Click a variant to preview it; clicking it again restores the base. Only one
variant or none can be selected, and the selected button is highlighted with
`aria-pressed=true`. Previews derive from the authored base every time and never
enter save/undo history. The grass strip's Ladybug zoomies preview scales insect
movement speed and walk clips by 8× and uses bounded varied-heading routes;
grass wind and the component clock stay inherited.
Clip mixers are separated by source and rate so shared models cannot contaminate
one another's playback. The SDK currently resolves multiply/replace overrides for
`motion.speed_mps` and `walk_clip.playback_rate`, and replacement of
`motion.algorithm` with a supported route; unsupported targets or a base
revision mismatch show an error and the base. New base revisions need explicit
variant rebasing. Clip rates are renderer options, not new persisted scene fields.

Objects may persist `animation_speed` to override the component clock for their
clips. Sparse `animated_grass` uses 1× while original grass and insect motion
inherit 0.125×. Explicit object clocks remain active even when the component clock
is zero; hiding the stage still pauses all rendering. Variant clip multipliers
are applied after clock selection, without rewriting the base object's value.

The previous conversation, proposal/Apply, memory, properties, construction tools
and material search controls have been removed from the stage sidebar, along with
their active stage hooks. Save/reload, undo/redo, navigation and construction
document editing remain. The underlying planner, memory and tool modules remain
available as existing capabilities; [conversation](COMPONENT_CONVERSATION.md),
[memory](COMPONENT_MEMORY.md) and [tools](COMPONENT_TOOLS.md) document that earlier
workflow rather than the current stage UI.

The parent ../Games.jsx owns sidebar selection and the persisted splitter.
`GamesPlayFlow.js` owns the nonpersistent development launch/reset phases. A new
page opens directly in `interactive`, preserving the current development startup.
Settings → control → Reset game closes the drawer, starts a new run and enters
`GamesPlayPrelude.jsx`. Its white-screen sequence is sampled by
`GamesPlayPreludeTimeline.js`, using the audio element's `currentTime` as its
sole clock: WELCOME begins fading at 0.47s (fully visible at 1.27s), "to" begins
at 2.87s while WELCOME fades through 3.9s, and "to" clears by 4.0s. At 4.0s,
the corner TV and lower CHAOS word appear with the already-moving ladybugs.
CHAOS holds until 6.17s then slowly fades through 12.17s,
when the confirmation scene begins. The GAME PLAY title stays mounted above the
same bounded game area throughout prelude, confirmation and interactive play;
the page header and sidebar remain outside it. The confirmation message anchors
to the bottom of this game area, not the browser viewport. Only the settings
gear hides during the prelude and confirmation. Click anywhere in the game area (including the TV), or
press Enter/Space/Escape, to skip immediately. Click capture prevents that same
click from toggling the TV or activating an underlying game control. Presentation
time follows buffering/pausing audio, and a delayed frame catches up to the music.
Completion and TV reveal are scoped to the current run; late callbacks cannot
advance a newer prelude after reset.
WELCOME uses a 20px type size, "to" is 14px, and CHAOS scales from 48px to 160px
with the viewport to create a much stronger final-word emphasis.

While waiting for confirmation, `GamesPlayIntroTitleCue.js` observes the same
music clock and releases FRACTO abruptly at 29.5s. `GamesPlayIntroTitle.jsx`
inherits `WelcomeStyles.Title` directly from the splash screen (monospace,
normal weight, spaced letters, outlined white text, shadow, 0.65 vertical scale).
It measures the natural lettering before paint and scales it to 50% of the game
area width, keeping the text horizontally symmetric and its bottom 1rem above
the area's vertical center. Resize adjusts that width without replaying the cue.
The title holds until audio 37.21s, then fades linearly over five audio seconds
and disappears at 42.21s. Buffering pauses the fade, and late observation samples
the current opacity without replaying it. Confirming earlier cancels the cue.

`GamesPlayPreludeAudio.js` manages the user-provided TwelveNoteFugue MP3 in
`public/audio/`, with default playback volume set to 25%. The audio element
preloads on page load; Reset calls `play()`
synchronously in the click handler to retain browser audio permission, restarting
at zero. It continues through the landscape reveal and stops on confirmation or
page unmount. Hidden tabs pause playback and resume at the same position. Rejected
playback or decoding errors offer a retry that starts a new welcome run. Cancelled
play promises and stale confirmation callbacks cannot affect a newer soundtrack.

`GamesPlayInteractive.jsx` owns the controller input, mapped commands, simulation,
flight state, instruments and map lifetime for one run. Reset unmounts that
session and its effects; confirmation mounts a fresh initial flight state
and neutral controls. The background preloads at audio time 0.8s, once WELCOME is
visible, with every material hidden over white and traversal already running.
At the shared 4.0s TV/CHAOS cue, only the ladybugs are released, immediately rather
than faded. The prelude's white overlay becomes transparent at that cue. Graphics
readiness never delays the audio cues; a late material appears when ready.
The music cues mark full visibility: stones fade from 8.75s to 10.25s;
dirt from 13.5s to 17.5s; small sparse grass tufts from 20.5s to 23.5s;
large dense tufts from 23.5s to 26.5s. Ladybugs still appear suddenly at 4.0s.
Each fade samples the music clock, independently of download
order or the text phase. Reset runs pass an
introduction flag that stays fixed when the message is activated, so revealing
game controls never reloads or restarts the background.
`GamesPlayGrassIntroduction.js` assigns the published material roles to the order
ladybugs → stones → dirt → small sparse grass → large dense grass. The optional
`ComponentOrderedReveal.js` coordinator supports explicit audio cues for these
five groups; other callers retain sequential arrival fades. Slow downloads never
delay a later cue, and late initial assets catch up to their current audio fade.
Downloads remain parallel. Missing categories are skipped; later streamed sections
use their category's fade after it has been introduced. Visibility and shadow
coverage change together, preserving grass cutouts and the final appearance.
Camera traversal and material animation start during loading and continue through
all five reveals, including waits for slower downloads. Once introduced, the
normal section lookahead guard resumes for future travel. Hidden tabs still pause
the clocks. Ordinary development page loads retain their existing arrival behavior.
Each background launch chooses a ladybug-visible forward-leg entry point with
`GamesPlayTraversalStart.js`. After the published document and variant load, it
checks the actual viewport against the insects' full motion envelopes, with a
2cm silhouette margin and eight seconds of camera travel reserved. It randomly
selects among qualifying positions within 10–90% of the route, at least 10%
of its length away from the previous start when available (about 1.89m on this strip).
If no position can fit an insect envelope in an unusually narrow crop, ordinary
random selection remains available. The
preceding choice is kept in tab session storage so refreshing and resetting also
changes the visible stretch. Storage is optional; in-memory fallback still varies
successive resets. The chosen offset is retained across resize, retries, reveal
cues and confirmation. It initializes the existing path controller before section
selection, so insects and stones are loaded for that view and already travel
downward at the cue. Authored objects, scatter seeds, route endpoints, speed and
turns are unchanged.
Only the active TV and bottom prompt overlay this scene. `GamesPlayConfirmation`
shows white calligraphic text in self-hosted Pinyon Script, at 42px with 0.14em
letter spacing and a tight shadow. It fades in once over 2.5 seconds when the
confirmation scene begins; phrase changes do not restart that entrance.
`GamesPlayConfirmation.css` registers its
naturally slanted outlines; the font and license live in `public/fonts/pinyon-script/`.
`GamesPlayConfirmationTiming.js`
alternates "confirm at will" and "confirm your will" with random 2.5–8.5 second
holds and occasional brief bursts. Timers pause in hidden tabs and are disposed
on exit. Only activating the final message button enters play (click, or native
Enter/Space activation while focused). Background clicks, TV interaction and
stage-level keys cannot show controllers, dashboard, map or settings. Skipping
the earlier timed prelude goes to this same confirmation scene, so a reset always
requires the final message before interactive play. Development startup still
launches directly into play. Display/control preferences and the fullscreen
container remain in place; resetting a run never restores preference defaults.
Background, prelude and interactive session use distinct run-scoped React keys
so transitions unmount old sessions without leaving orphaned controls or renderers.
The TV has a stable key across resets. Recreating its renderer, procedural casing
and armature textures, model and shaders in the reset commit previously delayed
the opening text. `GamesPlayTv.jsx` now keeps the initialized CRT for the whole
play page; reset hides it while the text starts and its media continues loading
independently. Fresh `GamesCrt` setup uses `CrtInitialization.js` to cross a painted
frame and start in a separate task, cancelling discarded StrictMode mounts before
any graphics are allocated. At audio time 4.0s the TV becomes visible in the same
corner and continues its live playlist, swivel and mechanical pose through the
handoff into play, without a remount. The existing CRT implementation is reused.

It gives the play pane full height so GamesPlay's flex content area can fill the
space below the title without clipping the gear or drawer to a zero-height box.
`GamesPlayGrass` fills that content area behind the flight scene, TV, scroll map,
instruments and controls with an explicitly published grass-strip base release.
`GamesPlayGrassRelease.js` pins the content-addressed manifest. The runtime
loader reads the packaged component, calibration and files; it makes no component
database or authoring material-catalog requests and has no fallback to them. The runtime
reuses the stage's calibrated geometry, animation clocks, motion and view-focused
shadows, without editor guides or controls. An orthographic camera looks straight
down onto a rotating cover crop of the 1 × 20 m floor. Its diagonal is at most
97% of the narrowest floor dimension, keeping dirt edges out during turns at
every aspect ratio, including fullscreen. The passive layer is
below FlightScene's existing -1 layer and never captures foreground interaction.
The parent passes its measured dimensions; the renderer resizes without reloading
assets, pauses while the document is hidden and disposes on unmount. Load/context
failure offers a localized retry. The previous brushed-metal background is removed.

The play binding selects **Ladybug zoomies**, authored variant revision 7 against
base scene 17. `GamesPlayGrassVariant.js` pins its three walking-insect deltas
and resolves them with the shared SDK: a bounded varied-heading route,
8× movement speed and matching 8× walk rate.
For the section player, the semantic walk rate becomes an insect-specific animation
clock (native 1× instead of the base 0.125×). The inherited component clock still
governs motion time. Each insect faces its current segment and chooses different
headings at corners instead of retracing a single line. Its ID seeds a repeatable
circuit within an ellipse covering the original patrol span, with lateral radius
one quarter of that span; section residency includes the complete sideways envelope.
Grass clocks, insect size/placement/patrol distance,
stones, dirt, route and source documents are preserved. The immutable optimized
base package and cached models are reused; no variant/API lookup occurs during
gameplay. Publication source revision is checked before applying the delta, so
rebasing onto a new base is deliberate. The component editor's base is unchanged.

Path motion is authored separately in `public/motions/slow-strip-patrol.json`,
and operated by the framework-neutral SDK `FractoPathMotion.js`. The Play layer
only binds that route to the saved grass base. `TopDownPathCamera.js` is a generic
renderer adapter consuming its poses; neither route nor controller references
this page or any model. Current movement is 1 cm/s between Z=±9.45 m, with 4-second
speed ramps, a 2-second endpoint pause and a 6-second in-place 180° turn. Material
animation clocks remain independent. Motion also runs for static models, pauses
with the hidden page and keeps progress through resize/fullscreen. Routes that
cannot contain the rotating crop on the floor are rejected instead of clamped.
Shadows follow the moving camera, reusing cached component bounds. The runtime's
`seek_motion(seconds)` supports previewing any phase without changing the route
or saved component; the live fixture tests complete turns without a half-hour wait.

The asset service owns explicit publication and the complete release directory.
Authoring saves never change an existing release. Publish the accepted scene,
deploy that directory with the asset service, then update the UI release binding.
Public/lab origins use the existing `/api/asset/component-runtime` route; direct
UI ports use a thin `/api/component-runtime` proxy. Neither path queries an
authoring registry. Files are immutable and browser-cacheable; the optimized
release totals about 41 MB, with visible sections and their nearby resources
loaded first.
Sidebar order is Overview, separator, worlds, music, play, models group (materials, components, areas), separator, wordnet, Settings, Status.
The models group uses the same labeled sidebar separator as Study’s bailiwicks group.
Overview, Settings, and Status intentionally remain blank.

## Inventory

The construction stage includes `MaterialSearchPanel.jsx`: bounded catalog search
over names/tags/categories/descriptions, placement filters, paginated results,
stable IDs/revisions and explicit missing placement facts. It does not place
objects or alter the component document. Expanding a result shows `MaterialFacts`;
its construction metadata can be edited there or beneath a material's catalog
preview via `MaterialMetadataPanel.jsx`. Search/paging is blocked while metadata
edits are open. Successful metadata saves invalidate the old search snapshot.

`MaterialMetadataEditor.jsx` owns the form and `MaterialMetadataForm.js` handles
blank/number/vector conversion with the SDK contract. Unknown dimensions, scale,
orientation, ground contact, footprint and texture tile size remain explicit;
preview geometry is not automatically treated as calibrated physical size.
Edits preserve original model files and use catalog revision checks. Metadata
editing and attribution/rename actions are coordinated to avoid replacing drafts.
`MaterialSearchStyles.jsx` owns the compact stage browser's styling. See the
asset service's `environment/MATERIAL_SEARCH.md` for fields and HTTP contracts.

The three dedicated pages are **materials**, **components**, and **areas**,
with matching **all materials**, **all components**, and
**all areas** titles. `GamesIngredients.jsx`, `GamesComposites.jsx`
and `GamesEnvironments.jsx` provide their headings around the shared
`GamesInventory.jsx` scaffold. Distinct page components unmount the previous
preview and own independent inventory state. Each page requests one database
category: material, component or area. All use the data service’s shared
`environment_assets` table and `model_category` column through the asset service.
Materials and areas import into their selected category and publish under
ingredients or environments respectively. Existing component catalogs remain browsable.
The internal `games_inventory` section and saved selection key remain stable.
Materials and areas retain Import folder in the toolbar below the title.
Components replace it with **new component**, opening a blank construction stage.
The former introductory message has been removed.
Materials, components and areas omit the visible Assets list heading; each list retains its accessible label.

`InventoryMaterialPreview.js` repairs a specific FBX cutout-export convention:
zero global opacity with the same texture assigned to color and alpha maps.
The preview uses the color texture's alpha channel, a 0.5 cutoff and double-sided
cards. Other transparent materials and other formats retain their settings.
The repaired cutouts use a subdued specular response so the legacy FBX highlights
do not wash out the texture. `InventoryCamera.js` fits projected model bounds,
including the scale references, to make wide/flat imports easier to inspect.
The corrected settings are captured before material toggles are initialized, so
wireframe/reset preserve the repair. A caption identifies the preview adjustment.
No asset source or catalog files are modified. This fixes the grasses3 FBX import.

Grasses 2 has a preview-only Grass density control from 0× to 8×, defaulting to
the imported 1× density. `InventoryGrassDensity.js` batches the repeated grass
clumps into one instanced mesh, retaining the initial placements at 1× and adding
deterministically scattered/rotated copies within the ground surface for fuller
settings. The ground is unaffected; geometry and materials are shared. Counts
and triangle statistics update with the slider. Reset and asset selection restore
1×. The control makes no requests and writes no catalog, GLB or Blender files.
Instance GPU buffers are released with the preview's normal disposal lifecycle.

`GamesInventory.jsx` owns preview controls and loading/retry status.
Its optional toolbar lets the components page supply its construction action.
Its optional `content` fills the area right of the tree (the preview and details
columns, `InventoryContent`); a page may also own folder selection
(`selected_folder`/`on_folder_select`). `GamesComposites.jsx` keeps the tree
on the left and shows `ComponentStage.jsx` as that content while a component is
selected, the same layout as the materials page. Selecting a folder (or a
published asset) shows the usual details instead; the loaded draft stays in the
editor, and re-selecting the same component returns to it without reloading. A
new unsaved component is not in the tree yet, so Resume returns to it.
`useComponentDocument.js` owns document save/load and request status;
`ComponentDocumentState.js` owns reducer/history/dirty semantics using the shared
SDK contract. `ComponentDocumentApi.js` is the bounded data-service client.
Saved (authored) component documents are listed in the page's left tree, beside
any published catalog components: `useComponentDocuments.js` reads every page of
`/api/component-documents` (at most 1,000) and `GamesInventory` passes them to
`InventoryAssetTree` as `document:<id>` leaves placed by each document's
`folder_path` (root by default). Choosing one loads it into the stage beside the
tree and highlights it, with the usual discard check for unsaved work. Saving
refreshes the tree, so new and renamed components appear. Folder create/rename/delete use the
same component-category folder tree as published components; the data service
moves contained documents on rename and refuses to delete a folder holding one.
In the stage, a saved component's toolbar has Move to folder
(`ComponentFolderMove.jsx`): a folder select with the green check and red X, or
Escape, using PUT `/api/component-documents/:id/folder`. Moving never changes the
document or its revision. Unsaved new components appear at the root after their
first save. Save persists the complete document with expected-revision checks.
The stage has no Back button; new/open/reload require inline discard (shown in
the page toolbar) when dirty. Browser close/refresh warns while dirty. Unsaved edits remain local
to the mounted components page. Saved documents survive navigation/restarts.
The stage supports name editing, save, load, undo/redo (100 snapshots), orbit/pan/
zoom, reset view, and graphics retry. Save preserves history; load resets it.
Ctrl/Cmd+S saves; Ctrl/Cmd+Z and Shift+Z or Ctrl+Y undo/redo outside text fields.
Save failures retain the draft; conflicts require explicit reload/review.
`ComponentStageScene.js` owns the on-demand Three.js renderer, camera, resize
observer and disposal. Its 20 m guide with 1 m grid and origin axes is editor
furniture, not an authored floor or placed material. `ComponentStageStyles.jsx`
owns the responsive workspace. Material selection/placement, floor texturing,
transforms and rendering authored materials are now provided by the construction
tools. Agent orchestration and creative memory remain future work.
The accepted design and staged roadmap are in
[COMPONENT_CONSTRUCTION_PLAN.md](COMPONENT_CONSTRUCTION_PLAN.md).
`useInventoryAssets.js` loads registered assets from the live catalog endpoint.
The left-hand tree follows that catalog, including imports after a page reload.
`InventoryImport.jsx` lets the user choose a local folder, name it, choose a model,
and import it. Original files and ZIP/RAR archives are preserved, archive contents are safely
expanded, and the new asset is registered and selected. Reimporting identical
source files selects the existing asset. Name collisions receive a suffix.
On narrow screens, controls move below the preview while the asset list stays
alongside it; on phone widths the list stacks above the preview.
`InventoryScene.js` loads the selected model through `InventoryModelLoader.js`, renders
on demand, supports orbit/zoom/pan and keyboard panning, and releases WebGL,
controls, textures, materials and geometry on unmount. Late loads are disposed
after navigation. `InventoryStyles.jsx` contains responsive styles.

The fixed 10 cm grid, 1 m ruler and optional 1 m reference cube stay independent
of the patch scale slider. Light direction/intensity, normal and roughness maps,
and wireframe can be adjusted. Reset restores all defaults and the camera.
Preview controls do not write to the source catalog. Scale and texture roles are
provisional; original files and unresolved attribution stay in the main asset
catalog. Preview resources are served directly from the registered asset library.

`InventoryCatalogPanel.jsx` displays the selected asset's creator, source,
license, attribution text/conditions, preserved files and modification history
below the preview. `InventoryCatalogEditor.jsx` owns the editable form and
`InventoryCatalogStyles.jsx` owns its presentation. `InventoryCatalog.js`
validates imports and edits, preserves unknown fields, and appends attribution
changes and optional modification notes
to history. Blank fields remain null; filling basic attribution marks it recorded
but unverified rather than claiming license verification.

`useInventoryCatalog.js` loads the current record from the same-origin
`/api/environment-catalog/:id` endpoint. Save writes attribution fields and an
optional modification note directly to the registered canonical `asset.json`.
The asset service's catalog store preserves all other fields, serializes
writers, rejects stale revisions, and replaces the file atomically. Failures keep
the form open. Reload explicitly discards the form and reads the latest file.
The old browser-only editor's differing drafts are recovered for review and an
explicit Save; they never overwrite the file automatically. The snapshot JSON is
now a test fixture, not runtime catalog data. No file picker or download is needed.

The Vite plugin and UI-owned production static server proxy to the asset service's
authenticated router. The asset service owns `servers/fracto-asset-server/models`
and calls the data service's internal registry API for database persistence.
`FRACTO_ENVIRONMENT_CATALOG_DIR` overrides its canonical library root when needed.
Neither the UI nor root infrastructure opens the library or database.
Catalog creator/source/license information uses the narrow
asset-provenance exception in PROJECT_GUIDELINES.md and is not logged.

## Corner CRT character

`GameAmbientMotion.js` gives the TV and parchment one shared slow force cycle,
sampled from the document animation clock. Its roughly 20-second sway gently
bobs and rolls the TV and turns the map in the matching visual direction.
The map adds this sway to its lagged attitude angle and updates the support
string from the combined angle; the nail remains fixed. Reduced motion disables
the shared sway for both objects.

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
Korean, Esperanto, or Latin, plus pirate speech and a deliberately nonsensical
lorem ipsum variant with the English
message's sentence cadence and punctuation. Its blinking alert reads exactly
`anim id est laborum`. Consecutive translated turns avoid repeating the same option. Each
pirate crawl ends with the blinking battle cry `TO ARMS, YE SCALLYWAGS!`. Each
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
raster. The attitude spring settles independently while ambient sway continues.
Animation pauses while hidden, and reduced motion disables sway and applies the
attitude target directly. Frame callbacks and subscriptions are released on
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
`ParchmentNameplate.jsx` adds a stationary weathered-steel plate below the map,
with four corner rivets, spaced FRACTO lettering, the atlas subtitle, and the
establishment year. It sits outside the rotating body, scales its typography to
the available map width, and reads its three lines from the Games AppText catalog.
The plate is centered at 60.8% of the map width and raised 2rem, with larger corner
rivets and fuller lettering. FRACTO uses the welcome screen's normal-weight
monospace font, 0.65 height scale, and proportional tracking (5px at 80px).
The second line has 0.08em tracking, and fluid type scales to fit the narrower plate.
Subtle pitting, scratches, mottled patina, and muted rivets give the metal a dull,
aged finish without the former polished highlight band.
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
  white outlined gear icon (filled on hover or focus) in that area's upper-right
  corner and the tooltip **settings**.
  Clicking it toggles a persistent Material UI drawer that slides in from the right
  with a **Settings** heading. The same button stays above the drawer and changes
  to a dark **×** (readable over the light drawer) with a **Close settings** tooltip while open. The drawer is positioned
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

### Folder import and preview resources

Blender `.blend` files are accepted alongside the direct preview formats. On
import, the server preserves the original and exports `runtime/model.glb` with
Blender. `working/blender-export.json` and the catalog history record changes made
only to the preview. Original particle systems remain editable in the `.blend`;
static previews realize object instances under a 500,000-triangle/256-instance
budget. Referenced textures are matched within the imported files. If exactly
one referenced image is missing and one supplied image remains, it is relinked
with an explicit review warning. Ambiguous missing textures fail the import.
World lighting is not exported. Simple Diffuse materials are adapted to Principled;
more complex shaders may require baking and visual review.

The server needs Blender 3.4+ with glTF export support (`FRACTO_BLENDER_BIN` can
override its executable). Docker development/build/runtime stages include Blender
and the NumPy exporter dependency. Conversions time out after two minutes and
failed conversions do not publish an asset. Embedded Blender scripts are disabled.

`InventoryImport.jsx` uploads a ZIP envelope to POST `/api/environment-catalog/import`.
The envelope is generated locally from the selected files; no absolute host paths
are sent. Browser/server validation shares SDK `FractoAssetArchive.js`. Inputs
support GLB, glTF, FBX, OBJ/MTL and 3DS, including bounded ZIP/RAR downloads. Limits are
2,000 files and 100 MiB including expanded contents. Originals are hashed under
`source/files`; extracted resources live under `source/extracted`. Readme/license
files are preserved; creator/license meanings remain unverified for later editing.

The importer serializes catalog publication with an exclusive library lock and
stages files before adding an index entry. A failed import leaves existing assets
untouched. If a process crashes during an import, an operator should verify no
import is running before removing a leftover `.catalog-import.lock`.

GET `/api/environment-catalog` provides the live list and declared preview files.
GET `/:id/files/*file` serves only resources declared by that registered record.
The model loader resolves accompanying local files, rejects external resource
fetches, and frames models automatically. Compressed glTF extensions requiring
extra decoders are not configured; those assets may need a plain GLB export.
Imported units and materials require visual review. GLB preview stats are derived
from the loaded model, and material toggles restore each material's original
alpha cutoff and color. Missing previews do not prevent catalog editing.

`InventoryAssetRequest.js` bounds catalog requests (including response bodies)
to 15 seconds. Timeouts show the existing error and Retry control instead of
leaving the list stuck on Loading assets. Navigation aborts requests quietly;
failed loads are not presented as an empty catalog inviting reimport.

## Model organization tree

All three category pages use InventoryAssetTree.jsx with the shared CoolTree
control. Folder paths form nested expandable groups; leaves retain permanent
asset IDs for preview selection. Folders sort before assets, with stable name/ID
ordering. The tree supports keyboard navigation and collapse/expand, and has a
bounded scrolling host. Selecting a folder does not replace the preview.

To organize an asset, select it, choose Edit catalog details below the preview,
and save Folder path (for example Vegetation/Grasses). A blank path means the
category root. The tree refreshes after a successful save while retaining the
selected asset. Folders are persistent category-scoped logical groups; model
binaries and library directories are not moved. Folder changes are revision
checked and recorded in modification history. Folder names are bounded to eight
levels, 64 characters each, 512 characters overall; absolute/traversal-style,
empty-segment and control-character paths are rejected.

New folder above each tree creates a root-level folder of the category. It
uses the same inline row as the details panel (below), and the same single-name
rules, so it no longer accepts slash-separated paths. Subfolders are created
from a selected folder's details panel. Definitions live in the data service, accessed through the asset
service and thin UI proxy. Select a model and choose Move to folder below its
preview, choose an existing folder (or Category root), then confirm. This form
uses the same revision-checked catalog save as attribution editing, preserving
attribution and recording movement history. Cancel leaves the asset unchanged.

Model inventory pages fill the Games pane. The preview stays above an independently
scrollable, keyboard-focusable details region containing catalog metadata, folder
controls, editing and history. The workspace also scrolls on short/narrow displays;
the asset tree and preview controls retain their own bounded scrolling areas.

Inventory trees keep every top-level node visible via CoolTree
`hide_single_root={false}`. A single folder containing the whole category must
remain a named, expandable row rather than becoming the hidden internal root.

Select any model or folder in the tree. Delete uses a dark red trash icon at the right edge of the
name row in the details panel, opening inline Confirm delete/Cancel
controls there. Its first click sends no mutation and never opens a popup. Rename
uses a pencil icon beside the name in the right-hand details panel and opens
its name editor there. Empty folders also have this details panel. Folder rename updates descendant assignments
in the same category. Delete requires an inline confirmation: models leave the
inventory while retaining files/provenance, and folders must be empty. Root cannot
be renamed/deleted. Cancel sends no mutation. Details actions are disabled while
catalog edits are open to preserve drafts. Successful actions refresh folders,
model selection and metadata. useInventoryDelete.js owns deletion request and inline confirmation state.

InventorySelectionName.jsx and useInventoryRename.js own the pencil action,
rename draft, revision fetch and save/cancel/error behavior. Folder selection is
coordinated by GamesInventory so the right panel follows the tree, including
renamed paths. Model preview controls appear only when a model is selected.

Rename replaces the header name in place with an input. Green check (submit) and
red X (cancel) icons sit to its right; pencil and trash are absent throughout the
edit, including while saving or displaying a conflict. Enter accepts and Escape
cancels. Failed saves keep the draft; Cancel sends no mutation.

The trash icon is revealed on name-row hover (or keyboard focus within the row).
It remains absent throughout inline name editing.

A selected folder's details panel has a New folder button below its path. It
opens the same inline row as rename: an input followed by the green check
(create) and red X (cancel); Enter creates and Escape cancels. It creates one
child of the selected folder, so the name cannot contain / or nested paths.
Names must also be portable folder names: at most 64 characters, not . or ..,
no trailing period, no Windows reserved names (CON, PRN, AUX, NUL, COM1-9,
LPT1-9, with or without an extension) and none of < > : " / \ | ? * or control
characters. Invalid or already-existing names show an alert, keep the draft and
send no request. The selected folder stays selected and the tree refreshes.
Rename, delete and New folder are mutually exclusive, and New folder is disabled
while catalog edits are open. InventoryNewFolder.jsx renders the button and
inline row for both the tree and the details panel; useInventoryNewFolder.js
owns the draft (the tree passes an empty parent); InventoryFolderApi.js holds
the folder-creation request and name validation.

The Move to folder editor uses the same green check and red X icons to the
right of its selector. Check submits the revision-checked save; X or Escape
cancels. Both actions are disabled while a save is running.

Model/resource load failures now show a model/texture error with Retry. Renderer
creation and WebGL context failures retain the graphics error. Folder imports
retain RAR sources and the asset service extracts their bounded preview resources.

Animated GLB/glTF and FBX previews retain their clips and loop the first authored
clip; Play animation pauses/resumes the current pose. Static models retain the
on-demand renderer. Animation pauses while the document is hidden and releases
its mixer and frame callback when selection changes. A separate framing parent
keeps preview centering/scale from overwriting authored animation transforms.
Initial framing uses precise posed vertices rather than unioning all morph targets.
InventoryAnimation.js owns mixer lifetime; InventoryScene.js owns the visible loop.

Play background residency is managed by `ComponentSectionContent.js`: one-metre
Z sections are grouped by material and selected using calibrated object bounds,
complete insect patrol envelopes and offscreen shadow reach. Dirt loads separately;
nearby groups attach as each material becomes ready, with optional ordered
visibility during the reset introduction. A shared four-worker queue
downloads each model prototype once. One extra metre around the visible region is
prefetched, and after the introduction the camera waits before entering an
unfinished region. During the introduction it advances while materials form. Loaded
sections remain resident for the return trip; new section animation clocks catch
up to component time. Disposal releases shared prototypes once. Editor stages
retain their full-scene loading behavior. This changes playback residency only,
not the published component or the separate path definition.

`ComponentStageReveal.js` gently reveals each arriving floor/material group over
1.2 seconds by default using an eased presentation clock; the reset introduction
supplies its own slower landscape durations. Temporary local shader materials
apply matching coverage ramps in visible and shadow passes, preserving foliage
alpha cutouts, depth writes, texture alpha and existing shader adapters. Materials
are restored exactly at completion and released on cancellation. The viewer runs
these fades while later downloads are pending, independently of the component's
authored animation multiplier; paused/hidden pages do not consume the fade. No
authoring data or published assets are changed. The reset introduction prioritizes
ladybug prototypes and uses `ComponentOrderedReveal.js` to sequence visibility;
ordinary development launches still reveal groups as they arrive.

The Play release binding selects losslessly compressed grass GLBs. The shared
inventory loader enables Three's bundled Meshopt decoder (no CDN or decoder
download); uncompressed catalog assets remain supported. Compression retains all
original geometry, morph targets, keyframes, material settings and texture bytes.
The original published package is kept for comparison and rollback.

Component stages also automatically loop the first authored clip of each placed
or scattered material, including every grass-strip patch. ComponentStageAnimation.js
groups clones by cached source, clock and clip rate, preserving the
outer placement, ground anchor and source-unit parents. Static stages render on
demand. The frame loop pauses in hidden documents and stops on context loss;
rebuilds, proposal changes and disposal release old bindings and callbacks.

Authored `document.animation_speed` (0–10, omitted defaults to 1×) is retained by
save/load, proposal hashes and undo/redo. Clips inherit it unless an object has
its own `animation_speed`; 0 pauses inherited clips and patrols, while explicit
object clocks continue. These rates are independent of Inventory preview options
and browser settings. The old properties controls are no longer in the sidebar.

Placed objects may also carry an authored `motion` patrol. The stage samples
the SDK's `facing-patrol-v1` at component time, moves the outer placement along
local +Z, and turns it to face the return leg. Clip animation stays below the
placement/anchor/unit parents. The document's initial transforms are never mutated;
reload/undo rebuilds reset component time. Component speed governs wind, walking
clips and movement together. The grass strip now retains the later user-edited
0.125× multiplier and includes 20 ladybugs in interior openings, one per metre.
Its current randomized grass distribution and measured coverage are documented
in [GRASS_STRIP_LADYBUGS.md](GRASS_STRIP_LADYBUGS.md).

InventorySpecGloss.js registers support for legacy KHR_materials_pbrSpecularGlossiness
assets. It restores diffuse/alpha textures and direct specular reflectance, and
reads gloss from the texture alpha channel with the authored UV set. The shader
adapter is preview-only; standard metallic/roughness materials are unchanged.
The material's clone and shader cache identity preserve the adapter. Shader
integration tests must pass when upgrading Three.js. Source models are untouched.

Inventory previews initially frame only the selected asset at its imported scale.
The 1 m reference checkbox reveals both cube and ruler and refits the view; turning
it off fits just the model. Tiny centimeter/millimeter assets use proportional
camera padding, near clipping and orbit limits, so meter references cannot make
them appear empty. Reference markers retain their real scale; source files and
catalog units are unchanged. InventoryCamera.js owns target/framing calculations.

InventoryImportData.js owns envelope creation and model discovery. Direct and ZIP
models are discovered locally. If the selected folder contains a RAR (including
one inside a ZIP), the dialog calls the read-only asset inspection endpoint before
showing the model selector. No browser RAR codec or application logic in the UI
proxy is needed. The final import sends the preserved originals again; the asset
service independently validates/unpacks them and publishes the selected model.
RAR-only downloads can therefore be imported without manually unpacking them.

For FBX foliage whose material ignores the diffuse texture's cutout alpha, the
preview samples a bounded 64x64 image after textures arrive. Only an otherwise
opaque material with both fully transparent and visibly opaque sampled pixels
receives alpha testing/double-sided rendering. Opaque bark textures and intentional
translucency retain their settings. Preview map snapshots retain the correction
across material toggles; original textures, models and catalogs are unchanged.
