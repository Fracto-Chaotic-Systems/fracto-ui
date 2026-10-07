# Orbital points study

This directory renders the orbit samples produced for the selected study focal
point.

## Files

- `PointsMainPanel.jsx` fetches the zero-seed legacy iterative series and
  detector/Newton result, then polls the FractoCardinality seeded survey job
  over `[-1.5, 1.5]` on both axes at 0.025 intervals. It adapts the orbital point
  records and owns the three charts. The survey runs asynchronously so it
  cannot hold the legacy chart response open; polling stops when the focal
  point changes or the page unmounts. Scope-only navigator changes update the
  frame settings without refetching or restarting the charts. When the detector returns cardinality 2, the Newton endpoint
  automatically uses the FractoFastCalc cardinality as its next
  candidate. The chart displays the resulting Newton points when their count
  matches that candidate; otherwise it retains the normal detector/Newton
  points and displays fallback diagnostics.
- `PointsSeriesChart.jsx` draws one point series and reports its cardinality,
  timing, detector/Newton effort, and two-point fallback status when applicable.
  For legacy iterative data, its magnitude summary uses the raw offset from
  the cardioid reference point. It selects pico (`p`) or micro (`μ`) only for
  small values and otherwise displays the base value without a prefix. The
  plotted coordinates may be multiplied by `10^13` separately to make tiny
  offsets visible; that plotting scale is not the summary's unit conversion.
- `SeedSurveyChart.jsx` plots stable non-singleton periodic candidates by their
  initial seed coordinates over `[-1.5, 1.5]` on both axes at 0.025 spacing. Each point uses the SDK's
  conventional pattern hue, with HSL lightness normalized across the survey's
  observed confidence range (18–88%). The same per-survey mapping is used on
  the Assets seed-surveys page; each survey's lowest confidence is darkest and
  highest is lightest, even when the range is narrow. Confidence is a heuristic
  evidence score, not a probability; tooltips show its raw score to three
  decimals. Unresolved candidates retain grey
  markers and may still report their confidence in the tooltip. While its worker job runs, it shows
  sample progress and all stable and unresolved markers discovered so far; the
  chart remains fixed to the full `[-1.5, 1.5]` range on both axes. The completed
  result contains the same full point sets. A grid sample appears only when the
  `FractoCardinality` reports a non-singleton candidate; its adaptive horizon
  expansion is disabled and capped at 4,096 iterations per seed inside the
  main cardioid. Outside it, the seeded fast-calculator fallback uses level
  `0.00625`. Escapes and
  one-point results are left blank; inconclusive detector results are shown
  in grey. This is a bounded exploratory survey, not proof of
  mathematical stability. Beneath the chart, it displays the range of per-
  orbit maximum distances from the sampled orbital points to the parameter's
  cardioid reference point `Q`.
- `StudyPoints.jsx` composes this directory's panels into the Study page.

Visible labels are registered in `../../../text/StudyText.jsx` and rendered
through `AppText` so the page remains ready for translation. The fallback
cardinality is a numerical candidate, not proof that a mathematical orbit has
been established.
