# Orbital points study

This directory renders the orbit samples produced for the selected study focal
point.

## Files

- `PointsMainPanel.jsx` fetches the legacy iterative series and detector/Newton
  result, adapts complex-point records to the chart format, and owns the two
  orbit-series charts. When the detector returns cardinality 2, the Newton
  endpoint automatically uses the FractoFastCalc cardinality as its next
  candidate. The chart displays the resulting Newton points when their count
  matches that candidate; otherwise it retains the normal detector/Newton
  points and displays fallback diagnostics.
- `PointsSeriesChart.jsx` draws one point series and reports its cardinality,
  timing, detector/Newton effort, and two-point fallback status when applicable.
- `StudyPoints.jsx` composes this directory's panels into the Study page.

Visible labels are registered in `../../../text/StudyText.jsx` and rendered
through `AppText` so the page remains ready for translation. The experimental
cardinality is a numerical candidate, not proof that a mathematical orbit has
been established.
