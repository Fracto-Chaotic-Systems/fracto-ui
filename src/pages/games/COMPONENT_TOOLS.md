# Component construction tools, v1

The stage now renders authored content and exposes floor, place, transform,
remove and scatter controls. Search for a material, choose **use for construction**,
then use the tool forms. Objects can be selected by clicking the stage or using
the selection list. Floor controls work immediately without a material: uncheck
the texture option for a plain neutral floor. A textured floor requires a
calibrated floor-surface material and an explicitly selected registered PNG,
JPEG or WebP color image. Physical tiling computes repeats from size/tile size;
the stored repeat values remain explicit. Floor origin is the center of XZ, Y=0.

Place/transform use an anchor position in meters, Euler XYZ rotation shown in
degrees (stored in radians), and positive XYZ scale. Placement requires the
material's calibrated source conversion, dimensions, signed axes, anchor and
footprint. Unknowns are not filled with guessed measurements. Calibrate metadata
for the registered runtime model's coordinate units and origin; an original
downloaded/DCC file may use different units after import conversion. Edit these
facts through the material browser. Select a scatter rule to edit its
parameters; select an object to edit its transform. Remove deletes the selected
object/rule or clears the floor. Undo reverses it. Groups remain organizational
document metadata; group transform/gizmo editing is not part of this milestone.

## Shared command contract

`@fracto/sdk/FractoComponentTools.js` supplies the pure
`apply_component_commands(document, commands, materials)` function. A batch of
1–100 exact-shape commands returns a new validated snapshot, or throws without
changing the input. The reviewed construction planner uses this same interface
for proposal replay; UI Apply independently resolves pins and replays it again.

- `{type:"set-floor", floor:null|{asset:null|{id,revision},size:[w,d],
texture_repeat:[u,v],texture_file:null|registeredRelativeImage}}`
- `{type:"place",object:{id,asset,position,rotation,scale,group_id}}`
- `{type:"place-pattern",asset,instances:[{id,position,rotation,scale},...]}`
  expands up to 1,000 explicit instances into ordinary ungrouped editable
  objects, within the existing total-instance and document bounds.
- `{type:"transform",id,position,rotation,scale}`
- `{type:"remove",id}` for an object or scatter rule.
- `{type:"scatter",rule:{id,asset,seed,count,bounds,exclusions,scale,group_id,
algorithm:"footprint-xz-v1"}}` inserts or replaces a rule with the same ID.

`materials` maps `assetId:revision` to the asset service's revision-checked runtime
descriptor. New references are independently checked against calibrated facts;
surface paths must occur in the registered resource allowlist. Limits are 1,000
total objects/scattered instances and 64 distinct referenced material revisions.
Removal/transform can repair a document containing another unavailable reference.

`useComponentConstruction.js` resolves new references over the existing thin UI
proxy before dispatching commands. `ComponentDocumentState.js` applies the batch
to the latest current document, preserving concurrent name edits and producing
one history snapshot. Completions for a different document ID are rejected.
Invalid commands or impossible scatter operations leave history unchanged.
Save/load uses the existing component API and preserves content/seed/algorithm.
The data service validates document structure; the construction client additionally
validates catalog availability and calibrated facts. The construction planner
also performs this validation in its own reviewed handler before returning a
proposal; Apply repeats the checks against current catalog pins.

## Frozen scatter algorithm

Animated model materials loop their first authored clip automatically in both
the saved draft and proposal preview. Repeated patches share a clip clock per
material. Animation affects the cloned source below its placement/anchor/unit
parents; document transforms and undo history are unchanged. Calibrated footprints
describe the rest pose, not an animated wind envelope. Static assets stay static.

**Animation speed (×)** in component properties edits the persisted component-wide
`animation_speed` multiplier (0–10; 0 pauses; missing means 1). Save commits it
with the component, and undo/redo restore its previous value. Every material clip
uses that multiplier, including recipe-generated grass patches.

Objects with an authored `motion` record walk within a short forward patrol,
turning to face back at the end. Speed is metres per component second, multiplied
by Animation speed; distance is metres. This movement is persisted and respects
save/load/undo/redo, rather than being a browser preview effect. The grass strip's
ladybugs retain independent randomized positions and headings in each metre.

`@fracto/sdk/FractoComponentScatter.js` implements **footprint-xz-v1**. It uses
mulberry32 with uint32 state and four sequential draws per attempted placement:
X, Z, yaw [0,2π), uniform scalar scale. Candidates sample the stored XZ rectangle.
Their conservative rotated/scaled footprint AABBs must fit entirely inside it
and must not touch/intersect any exclusion rectangle. The rectangle is centered
on the calibrated anchor; calibrate the footprint to conservatively enclose the
asset around that anchor. No other instance-overlap or mesh-collision solver is
implied. Exclusions can represent a walking path, including a safety margin.

At most max(100,count×50) candidates are tried. Failure to reach the exact count
rejects the entire command. Scatter is capped at 1,000 instances/32 exclusions
under the document-wide limits. Seeds, rules, catalog revisions and this algorithm
determine regeneration; there is no Math.random dependency. Never change this
algorithm's draw order, generator or acceptance rules under the same identifier.
Existing pre-rendering v1 rules without algorithm use footprint-xz-v1; newly
authored rules write it explicitly. Unknown algorithms are rejected.

## Document compatibility

Document schema v1 has additive floor.texture_file and scatter.algorithm fields.
Floor.asset may now be null for a plain floor. Existing records without those
fields remain readable. Old material-bearing floor records without an explicit
texture cannot render until repaired; no image is guessed. Deploy SDK/UI/data
changes together before authoring these additions. MySQL JSON storage needs no
migration. Resource resolution requires the current exact catalog digest; there
is no historical-resource snapshot store or automatic repinning.

## Rendering and resource lifetime

`ComponentStageScene.js` owns camera/orbit/picking, lighting and selection boxes.
Fit construction frames authored content; editor guides remain independent.
`ComponentStageContent.js` owns asynchronous content generations, current-revision
resolution, model prototype caching, floor texture resources and disposal. Stale
loads never attach after a newer edit or unmount. Failed resources leave the
document intact with a visible error and Retry; unsupported or missing revisions
are never silently substituted. Removing unavailable items remains possible via
the selection list. Name-only edits do not reload geometry.

`ComponentStageGeometry.js` preserves source transforms and shares geometry/
materials while cloning skeleton hierarchies. Calibration is applied as
T(position) × R(user XYZ) × S(user) × R(source axes→stage) × T(-anchor meters) ×
S(meters per source unit) × authored model. There is no preview recentering or
bounding-box normalization. FBX cutout repairs and legacy glTF material support
reuse inventory helpers. Animations remain in the static authored pose. Clones
share resources but are not GPU-instanced; very complex/high-count assets can
still be expensive. Physics, snapping, animation and drag gizmos are later work.

`ComponentFloorTools`, `ComponentPlacementTools`, `ComponentScatterTools` own
their form drafts; `ComponentConstructionTools` coordinates selection and errors.
`ComponentToolFields` supplies vector parsing/localized text. Styles remain in
`ComponentConstructionStyles.jsx`. No source model, image or portable asset
metadata is changed by these construction tools.
