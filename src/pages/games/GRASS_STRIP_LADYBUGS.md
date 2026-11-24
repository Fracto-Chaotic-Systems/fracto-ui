# Grass strip insects

The authoritative construction intent and rules are now described in the data
service's `components/blueprints/grass-strip/grass-strip.md`, with a structured companion and
the revision-8 realization snapshot. This UI note retains implementation and
verification history; future changes should update the construction description
alongside the model.

The initial insect version (revision 7) contained 20 animated ladybugs, one randomized
position in each of its 20 metre sections. Its 809 grass patches and the later
user-edited component animation speed of 0.125× were retained. The insect group
is named **Ladybugs · one per metre**.

## Revised open distribution (revision 8)

The current saved component uses 420 randomly positioned and rotated grass
patches instead of 809 overlapping patches. Narrower clumps retain varied tall
blades. Rasterizing actual projected leaf triangles at 2 cm sample centres gives
65.1% grass cover across the dirt floor, ranging from 60.8% to 70.7% per metre.
This measures projected geometry, rather than rectangular material footprints.

All 20 existing ladybugs were relocated into the central half of the strip,
one per metre, with interior openings about 13 × 21 cm around their patrols.
Their scale, motion records, identities and 0.125× component timing were retained.
All 300 overhead visibility rays stayed clear across five sampled playback
frames while the grass swayed and bugs moved. Live checks reloaded revision 8,
verified every insect's skinned animation, facing and section bounds, and checked
wind playback on all 420 grass patches. Exact save/reload equality passed.

The sections below document the original calibration and edge-placement work;
the revised interior layout supersedes those placement/density decisions. The
earlier dense recipe remains a separate reviewed recipe for complete coverage.

The new insects-folder material was measured from actual Three.js skinned
geometry and calibrated through the asset API. Its authored head points +Z.
Object scale 1.5 gives an overall length of about 13.3 mm including antennae and
legs, with a 12.7 mm total lateral span. Measured mid-height blade widths in the
large grass patches have a median of about 25.4 mm. Scale is a curated game
decision; source files and clips are preserved.

Locations were seeded, then tested against actual grass triangles. The selected
edge gaps have grass above both ends of every short patrol, while 15 sampled
low-angle visibility rays per insect (five points at three positions) are clear.
This is an under-canopy view, rather than a guarantee of visibility from every
camera angle. Textured close-ups on both sides were visually checked.

Each insect's optional `motion` record uses the SDK's `facing-patrol-v1`: it
walks 25–40 mm along its facing direction, turns 180° and walks back. Native
speeds are multiplied by component time, giving about 0.7–1.0 mm/s at 0.125×.
The original skinned walk clip plays with the same component clock. Initial
positions and motion are persisted, not continuously rewritten with render poses.

Live verification reloaded the saved component and checked all 20 animated leg
rigs, head/facing direction, forward motion and full skinned geometry over 160
seconds of sampled playback. No geometry left the strip or its own metre section.
Feet remain at the recessed dirt surface. Exact save/reload equality was checked;
the original revision 6 is backed up in ignored UI-owned maintenance diagnostics.
Shared motion/document/tool tests, UI content/proposal tests and the data-service
API tests passed. The live grass check verifies every currently saved grass
patch at the component's current speed (420 in revision 8).
