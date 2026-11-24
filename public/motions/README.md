# Reusable path descriptions

These JSON files describe motion in model-space metres, independently of model
geometry, component documents and pages. The SDK's `FractoPathMotion.js` owns
validation and operation. A renderer binds a description to a camera or object;
the same description/controller may be reused elsewhere without copying timing
logic. Paths do not contain component IDs, material references or UI state.

`slow-strip-patrol.json` describes an 18.9 m centre-line route, from Z=9.45 to
Z=-9.45 at X=0/Y=0. It travels at 0.01 m/s (1 cm/s), accelerates/decelerates over
4 seconds, holds still for 2 seconds at each end, turns 180° over 6 seconds, and
returns. One traversal takes 1,894 seconds; the complete repeating cycle takes
3,804 seconds. This is wall-clock motion, independent of material clip speeds.

The Play background currently binds this route to the saved 1 × 20 m grass-strip
base. The view has a rotation-safe footprint less than 0.97 m across, leaving at
least 6.5 cm before either longitudinal floor end. Resizing keeps the
same progress/phase. Hiding the page pauses traversal without jumping ahead.
New models must supply compatible space and units, or use another route; do not
silently clamp an incompatible route. V1 supports planar XZ polylines. Each end
pauses/turns; intermediate corners change tangent without an added pause.
Runtime camera positions are never written into the component definition.
