# Chart utilities

This folder contains shared chart presentation helpers.

- `ChartUtils.jsx` calculates square plot bounds around the supplied primary
  point series and any comparison points. If the data has no spread, it gives
  the plot a small nonzero viewing window so a single point or a collapsed
  orbit remains visible.
- `ChartOrbitals.jsx` defines shared orbital-grid styling and scatter-chart
  options.
- `ChartStyles.jsx` contains styled wrappers used by chart components.

`find_bounds()` changes only the viewing bounds; it does not alter coordinates,
cardinality, or the underlying orbital result. Callers that need a domain with
specific mathematical meaning can pass an explicit bounds override through
the chart helper instead.
