# Tiles pages

`TilesOverview`, `TilesSettings`, `TilesStatus`, and `TilesLogs` provide tile
service information and configuration. `TilesInspector` inspects cached tile
data, and `TilesTest` hosts tile benchmarks and animation tests.

`TilesGenerator` combines the navigator, coverage controls, generation operations,
and queued automation. Its operation components live in `generator/`.

`TilesTransform` is the mesh transforms page, selected by **transform** in
the Tiles sidebar. It composes the same navigator field, legend, history, and
splitters as Generate, with independent persisted frame and splitter settings
under `tiles_transform/`. The title uses the shared operator/automation/manager
selector with its own `tiles_transform` mode namespace. Modes are selectable
and persisted. Manual transform jobs run in operator mode. The right content area shows
the mesh availability heat map in every mode, without a separate panel heading.

`MeshHeatMap` owns requests, cancellation, inventory polling and selected levels;
`MeshHeatMapView` owns canvas presentation and statuses. `MeshCoverageTable`
uses the same `CoolTable` and shade rendering as Generate, positioned to the
right of the heat map. Its columns are shade, level, tile count, mesh count,
and can do. Positive can-do counts open a transform operation panel. Can do is the exact
indexed tile count minus ready mesh count at that level. Levels with tiles but
no meshes remain visible; mirrored placement never doubles the file counts.
Rows are ordered by level and stop after including the first row whose can do
exceeds 50,000. Exactly 50,000 does not trigger the cutoff; each new region or
inventory response recalculates it.
The table has no checkbox selection column.
Narrow panes can scroll horizontally to retain the side-by-side layout.
Status messages appear below the map. Loading uses an indeterminate
progress bar matching the displayed map width, with an accessible label instead
of visible loading text.
The page owns right-panel geometry and subscribes to its navigator
splitter so the heat map resizes with the panel. Its frame and splitter keys
remain independent from Generate.

Navigation/size changes request `/mesh_heat_map_buffer`; changes to transient
render metadata do not. The map queries `/mesh_inventory` every five seconds
and refreshes a stationary view when inventory epoch, namespace or revision
changes. Epochs survive ordinary restarts and change when an index is rebuilt
without a valid snapshot, avoiding a missed refresh if the counter repeats. Old responses
are ignored, replaced requests are aborted, and requests time out after 20
seconds. Polling, timers and requests stop when the page unmounts. Failures show
a retry action and can recover on the next inventory poll.

The canvas uses the existing level palette, with level 0 painted as the neutral
uncovered background. The table shows canonical numerical tile and ready mesh counts;
mirrored coverage does not double the count. Sampling fits the available panel
and navigator dimensions within endpoint pixel limits. No mesh files or numerical
tiles are fetched for the heat-map panel itself.

`MeshTransformOperations` captures the clicked count, level and navigator region.
Its heading is `transforming {count} tiles of level {level}`. Start explicitly
submits the selection, polls progress, and refreshes mesh coverage on completion.
Stop preserves published meshes; Resume submits the remaining count. Switching
away from operator mode stops the manual job. Navigation during a job retains
the captured region. Leaving the page stops polling but leaves the server job
running; returning users can select the remaining can-do count. Stale counts
receive HTTP 409 and require a refreshed selection. The view owns presentation
and AppText supplies all operation labels.

Each page owns its state and cleans up its subscriptions and timers when the
Tiles sidebar switches pages. `TilesUtils` contains shared tile-page helpers.

MeshTilePreview displays two 300px square canvases beneath the operation heading, using the shared TILE_RENDER_WIDTH_PX constant and Generate’s one-rem gap. It follows the latest successfully published tile sampled by job polling and retains the last preview after completion. Both canvases use the stored raw pattern/iteration data and the standard palette renderer; the right canvas displays the actual cached positions/UVs/triangles. Relief defaults to captured navigator scope / 25, with a local 0–200% height control, and mouse orbit/zoom. Preview requests are bounded, aborted on replacement/unmount, and isolated from construction errors. WebGL failure leaves the 2D view and job controls available. MeshTilePreviewData owns decompression/palette/height conversion; MeshTilePreviewScene owns demand rendering and GPU disposal. No mesh is rebuilt in the browser.

The paired preview is lazy-loaded when an operation begins, keeping Three.js out of initial page loading. Live verification completed all 47 level-4 tiles in the default region and confirmed the local height control changes the mesh relief.

While a transform is starting, queued, running or stopping, MeshHeatMap freezes its coverage image, counts and map parameters. Inventory polling and map refreshes pause, including navigator changes; in-flight responses are aborted and ignored. Terminal job notifications refresh the latest navigator region and resume ordinary polling. Tile/mesh previews and job progress continue independently.

The preview status row always reserves one line, so waiting/loading messages cannot move the height control or operation progress. After the first tile is visible, routine per-tile loading text is suppressed while the existing canvases remain displayed; actual preview failures still appear in the reserved status row.
