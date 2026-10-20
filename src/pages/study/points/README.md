# Orbital points study

This directory renders the orbit samples produced for the selected study focal
point.

## Files

- `PointsMainPanel.jsx` fetches the zero-seed legacy iterative series and
  Newton result, then polls the FractoCardinality seeded survey job
  over `[-1.5, 1.5]` on both axes at 0.025 intervals. It adapts the orbital point
  records and owns the three charts. The survey runs asynchronously so it
  cannot hold the legacy chart response open; polling stops when the focal
  point changes or the page unmounts. When legacy-iterative data has a positive
  cardinality, the page passes it to `/orbital_newton` with source
  `legacy_iterative`, bypassing independent detection. The supplied count is
  retained while loading and as a formatting fallback. Missing/zero legacy
  counts retain the detector-based request path. Scope-only navigator changes update the
  frame settings without refetching or restarting the charts. When the detector returns cardinality 2, the Newton endpoint
  automatically uses the FractoFastCalc cardinality as its next
  candidate. The chart displays the resulting Newton points when their count
  matches that candidate; otherwise it retains the normal detector/Newton
  points and displays fallback diagnostics. Outside the main cardioid, the
  endpoint refines a non-estimated positive calculator pattern using Newton
  and labels its source `fracto_fast_calc_outside_cardioid`; it no longer
  returns only the raw calculator shape that this chart cannot display.
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
  observed confidence range (18–88%) when detector confidence is available.
  Calculator-derived candidates have no detector confidence and use the normal
  pattern hue. Assets surveys use the separate `FractoColors` buffer renderer. Confidence is a heuristic
  evidence score, not a probability; tooltips show its raw score to three
  decimals. Unresolved candidates retain grey
  markers and may still report their confidence in the tooltip. While its worker job runs, it shows
  sample progress and all stable and unresolved markers discovered so far; the
  chart remains fixed to the full `[-1.5, 1.5]` range on both axes. The completed
  result contains the same full point sets. `stable_points` includes both
  detector-derived and non-estimated calculator-derived non-singleton
  candidates, with a per-point `cardinality_source`; its adaptive horizon
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

For the main-cardioid interior case, the Newton chart uses the positive
legacy-iterative cardinality directly. The request explicitly supplies that
period and does not depend on a detector envelope being present. For example,
`0.2+0.3i` has legacy pattern 1 and yields one Newton-derived point (plus the
chart's closing duplicate), rather than displaying cardinality 0.

Newton results now explicitly report `closure_reached`, `closure_error`, and
`closure_tolerance` (1e-7). Closure checks every transition, including wraparound;
BigComplex checks use its decimal precision. Failure has status
`closure_not_reached`, an empty `point_list`, and accepted `cardinality: 0`.
The supplied estimate remains `candidate_cardinality` for diagnostics only.
Callers must require `closure_reached === true`; an iteration-limit approximation
must never be rendered or counted as an orbital. Closure does not prove the
supplied primitive period or dynamical stability.

Best-iterate selection in BigComplex uses Decimal comparisons, not JavaScript
object comparisons, and saves the updated root estimate. This corrects stale
approximations caused by exponent-form comparisons and avoids constructing the
saved cycle from the pre-update iterated point. The formerly reported six-point
99.74% example now closes within tolerance after this correction; an insufficient
iteration budget remains explicitly rejected.
