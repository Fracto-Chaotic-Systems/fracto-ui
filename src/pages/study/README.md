# Study page components

This directory contains the content panels mounted by the Study page in
`../Study.jsx`. That parent owns sidebar navigation and saved section selection;
each panel owns the content for one Study section. Visible labels come from
`../../text/StudyText.jsx` through `AppText`.

## Panels and shared utilities

- `StudyCircuitry.jsx` composes the circuitry controls, chart, and related
  orbital analysis.
- `StudyFields.jsx` displays field views and their frame controls.
- `StudyFullMap.jsx` displays the temporary logistic-map diagnostic controls.
  It starts the level-one calculation, polls its ephemeral job for progress,
  and renders compact outcome/timing rows after completion (or partial rows if
  the worker times out).
- `StudyInline.jsx` displays inline bailiwick studies.
- `StudyMeridians.jsx` composes core-meridian data and visualization.
- `StudyMinibrots.jsx` composes the freeform minibrot list and detail panels.
- `StudyNodes.jsx` displays nodal bailiwicks.
- `StudyOrbitalDetector.jsx` composes orbital detector controls and results.
- `StudyOverview.jsx` is the title-only Study overview panel.
- `StudyPoints.jsx` owns the Orbital points title and three content panes.
  The left pane stacks three equal-height sections with 1px grey separators.
  CSS grid redistributes their heights whenever the content area is resized.
  The middle left section mounts `points/PointsMinibrotTabs.jsx`: “free”,
  “inline”, and “nodal” tabs using the shared `MinibrotList` with their respective
  bailiwick types. Only the active list mounts; its viewport scrolls within the
  section and resizes with it. Selection is lifted to the page and passed to
  `points/PointsStoredOrbitals.jsx` in the bottom-left section. It loads stored
  progressions at the selected `core_point` and shows a calculation link only
  when the lookup succeeds with no stored orbitals. The top-left section and
  right panes remain empty. Tab changes clear selection; old list responses
  cannot restore an obsolete selection.
  Its vertical divider defaults to 500px from the content area's left edge
  (after the Study sidebar). A horizontal divider splits only the right pane,
  defaulting to 500px below the content area's top (below the title). Separate
  `study/points/vertical_splitter_pos` and `horizontal_splitter_pos` settings
  persist these offsets independently of the retained legacy navigator settings.
  The page observes available dimensions and bounds the displayed dividers on
  small screens without overwriting saved offsets. It mounts no navigator or
  chart panels. Calculations start only through the explicit one-focal-point link;
  the lower panel polls that job and reloads committed points and Julia ratios.
- `StudySettings.jsx` displays Study configuration controls.
- `StudyStatus.jsx` displays the Study status panel.
- `StudyUtils.jsx` contains shared Study formatting, rendering, and request
  helpers used by the feature panels.
- `OrbitalSpectrumChart.jsx` renders orbital spectrum and detector result
  visualizations.

## Feature directories

- `circuitry/` contains circuitry chart and rendering components.
- `fields/` contains field-view components.
- `magnitudes/` contains orbital magnitude and Farey sequence components.
- `meridians/` contains meridian visualization components.
- `minibrots/` contains the shared bailiwick list and detail-panel components;
  see [its README](minibrots/README.md). Freeform details include a 500px square
  context canvas at three times the saved display scope, below the item details.
  Automatic parameter paths include the principal antenna tip, 1/2, 1/3, 2/3
  wakes and 0/1 root access. The adjacent table uses that order with tip selected
  by default, pattern blocks and global angle fractions; only selected paths
  have colored highlights and canvas labels. The feature README links the SDK
  calculations and published Milnor/Schleicher theoretical basis.
- `points/` contains the active bailiwick list tabs and retains the previous
  orbital point chart and panel components for reuse; those chart components
  remain disconnected from `StudyPoints.jsx`.

When a Study page adds or changes behavior, update the corresponding panel and
its text or setting registry, and keep this directory guide current.

The Full Map diagnostic is exploratory. Results are held by the running data
server only and disappear on restart or after their short retention period;
durable tile-like result storage is a later feature phase.
