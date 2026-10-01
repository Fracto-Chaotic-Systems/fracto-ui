# Study page components

This directory contains the content panels mounted by the Study page in
`../Study.jsx`. That parent owns sidebar navigation and saved section selection;
each panel owns the content for one Study section. Visible labels come from
`../../text/StudyText.jsx` through `AppText`.

## Panels and shared utilities

- `StudyCircuitry.jsx` composes the circuitry controls, chart, and related
  orbital analysis.
- `StudyFields.jsx` displays field views and their frame controls.
- `StudyFullMap.jsx` is the initial title-only scaffold for the Full Map
  sidebar destination. It displays the title `logistic map` and deliberately
  has no map content yet.
- `StudyInline.jsx` displays inline bailiwick studies.
- `StudyMeridians.jsx` composes core-meridian data and visualization.
- `StudyMinibrots.jsx` composes the freeform minibrot list and detail panels.
- `StudyNodes.jsx` displays nodal bailiwicks.
- `StudyOrbitalDetector.jsx` composes orbital detector controls and results.
- `StudyOverview.jsx` is the title-only Study overview panel.
- `StudyPoints.jsx` composes the orbital point list and chart.
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
- `minibrots/` contains the freeform list and detail-panel components.
- `points/` contains orbital point chart and panel components.

When a Study page adds or changes behavior, update the corresponding panel and
its text or setting registry, and keep this directory guide current.
