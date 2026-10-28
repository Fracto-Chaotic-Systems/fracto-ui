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
and persisted; no transform jobs are executed yet. The right content area shows
the mesh availability heat map in every mode.

`MeshHeatMap` owns requests, cancellation, inventory polling and selected levels;
`MeshHeatMapView` owns the canvas presentation, statuses and level/count/coverage
table. The page owns right-panel geometry and subscribes to its navigator
splitter so the heat map resizes with the panel. Its frame and splitter keys
remain independent from Generate.

Navigation/size changes request `/mesh_heat_map_buffer`; changes to transient
render metadata do not. The map queries `/mesh_inventory` every five seconds
and refreshes a stationary view when namespace/revision changes. Old responses
are ignored, replaced requests are aborted, and requests time out after 20
seconds. Polling, timers and requests stop when the page unmounts. Failures show
a retry action and can recover on the next inventory poll.

The canvas uses the existing level palette, with level 0 painted as the neutral
uncovered background. Each level can be hidden independently, or all levels
selected. The table shows canonical mesh counts and visible area percentages;
mirrored coverage does not double the count. Inventory refresh preserves level
selection; navigating resets it to all levels. Sampling fits the available panel
and navigator dimensions within endpoint pixel limits. No mesh files or numerical
tiles are fetched for the heat-map panel itself.

Each page owns its state and cleans up its subscriptions and timers when the
Tiles sidebar switches pages. `TilesUtils` contains shared tile-page helpers.
