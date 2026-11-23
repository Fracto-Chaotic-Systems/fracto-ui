# UI data preparation

`environment_catalog_plugin.js` mounts the transport-only catalog proxy in Vite.
`environment_catalog_proxy.js` streams requests to the loopback asset service
selected by `FRACTO_ASSET_PORT`, forwarding necessary content/session/origin/range
headers while excluding internal service tokens supplied by browsers. A bounded
timeout covers Blender conversion; connection errors become sanitized 503s.
`serve_ui.js` serves the built UI and the same proxy in production. It lives here
rather than in the root. None of these modules opens asset files or MySQL.

## Pong screen clip

`render_pong.py` creates an original 16-second, silent Pong-style video at
`public/screens/pong.mp4`. It draws RGB frames using Python's standard library
and pipes them to FFmpeg for H.264 encoding. Pass `--ffmpeg <executable>` when
FFmpeg is not on PATH. Optional `--output`, `--seconds`, and `--fps` control the
render. It refuses existing output, stages an unsupported `.part` file while
encoding, fully decodes the result for verification, then publishes the finished
MP4 for automatic playlist discovery.

## Corner CRT preview

`crt_screen_media_plugin.js` scans `public/screens` into the
`virtual:crt-screen-media` catalog for Game Play's default shuffled playlist.
It preserves public URLs (encoding spaces) and refreshes the dev catalog when
supported images/MP4s are added or removed. Production scans happen at build time.
A three-second catalog poll catches file additions missed by Docker bind-mount
watchers. It reloads the page only if the set of eligible files actually changes,
and its timer and watchers stop with the dev server.

`crt_screen_preview.html` exercises the same production component with selectable
face, static, image, locally generated video, animation, mixed-layer, playlist,
portrait and library-video modes. The latter plays an actual MP4 from the public catalog.
Portrait mode uses a real vertical image to inspect the top-to-bottom crop/pan.
It owns and releases its demonstration video stream. Move the pointer and click
the glass to check mapping at different angles and in both arm poses.

`crt_preview.html` mounts the production games CRT with its text catalog, without
service discovery, authentication, or saved preferences. Open
`/scripts/crt_preview.html` on Vite, move the pointer to test swivel/tilt, and use
the TV screen (including keyboard activation) to extend/retract the neck. The fixture
uses a 320px sidebar; resize its root to inspect narrower layouts.

Flight fixtures use the current always-visible controller action display; they
no longer depend on a removed controller-actions visibility setting. Vite scans
only `index.html` for startup dependency optimization. Preview pages remain
available on demand; generated HTML reports are not application scan entries.
`test/flight_preview_entries.test.js` bundles both fixtures to catch missing local
exports and validates the development scan entry.

## Dashboard textures

`dashboard-textures.py` downloads the approved Poly Haven Oak Veneer 01 diffuse
map and ambientCG Metal011 and Wicker010A 1K JPG archives, converting their color maps to WebP under
`public/dashboard/`. Run with Python and Pillow installed; neither is required
at application runtime. Source and license information is in that asset folder's
README. Output includes archive checksums and encoded sizes.
It also fetches the public-domain Iridescent Fluid Abstract JPEG for the animated
mother-of-pearl finish and encodes it at WebP quality 85.

## Integrated flight validation

`flight_validation.html` mounts the actual production dock, on-screen controller,
command mapper, and instruments with isolated in-memory settings. Open
`/scripts/flight_validation.html` on Vite. It provides heading wraparound,
invalid/missing telemetry, 60-frame streaming, fullscreen, and synthetic touch
press/cancel checks. Actual button clicks and joystick drags update its retained
action/peak-movement diagnostics; streamed telemetry should not increment the
game parent's render count. Resize to test cramped-area fallback and recovery.
The touch buttons synthesize PointerEvents through the real controller target;
physical touchscreen and OS gesture behavior require separate hardware testing.
See `src/pages/games/flight/README.md` for the validation record and environment
limits. This fixture never writes saved user preferences.

## Flight control mapping fixture

`flight_controls_smoke.html` mounts the production control preferences and action
help overlay against synthetic held input and the mapped command store. Open
`/scripts/flight_controls_smoke.html` on Vite. Hold cross, edit its assignment,
and verify the effective help changes immediately. Assign the left vertical
axis to pitch, hold it up, and test inversion, sensitivity, and dead zone.
The half-trigger sample checks analog strength; release/disconnect clear output.
Changes use the game's saved flight-control preferences; restore defaults after
testing. The fixture enables help only in memory and does not change the saved
controller-actions switch. Its AppText import precedes AppSettings to respect
the existing Dom/RootSettings module initialization cycle in standalone fixtures.

## Flight instrument compatibility fixture

`flight_state_smoke.html` mounts the production instrument groups and status
caption against the flight-state store. Open `/scripts/flight_state_smoke.html`
on Vite. Publish sample telemetry to update all six readings without increasing
the parent render count; test unavailable status, preview reset, and unmounting
and remounting. All fixture readings are synthetic. See the contract in
`src/pages/games/flight/README.md`.

`flight_indicators_smoke.html` mounts the six planned flight instruments with
React StrictMode, synthetic flight values, custom scales, and a 150px size.
Open `/scripts/flight_indicators_smoke.html` on the Vite server. Use **Change
flight values** to exercise updates (including heading 359 to 1) and **Remount
instruments** to exercise cleanup and mounting. Inspect the browser console as
well as the on-page error output. This is a development fixture, not a gameplay
route or a flight simulation.

`npm run test:flight-indicators` checks both package export formats against the
application's React runtime. Browser rendering and production bundling must also
be checked when upgrading the dependency.

`wordnet-convert.js` reads WordNet 3.1 data.noun, locates the abstraction /
abstract_entity synset by lemmas, and follows noun hyponyms (~) and instance
hyponyms (~i). It retains original offsets, synonyms, glosses, lexicographer
categories, children and hypernym links. Parents outside the extracted branch
remain source references. Cycles and missing descendants are rejected.
The JSON embeds the source license and a separate LICENSE.txt is written.

Run from this UI repository:

```powershell
node scripts/wordnet-convert.js D:/mediaplex/wordnet/wn3.1.dict/dict public/wordnet/abstract-nouns.json
node --test test/wordnet.test.js
```

The source dictionary is read only. Generated output is loaded on demand;
the running browser and deployed server do not need the source directory.
Format reference: https://wordnet.princeton.edu/documentation/wndb5wn

## Feature catalog checks

`render_chaotic_bars.py` reads `public/screens/smpte-color-bars.png` and generates
`smpte-color-bars-chaos.mp4`, preserving the pattern geometry while shuffling
colors at irregular intervals. It uses Python's standard library and FFmpeg,
refuses to overwrite output, and verifies a full decode before publishing it.
Run `python scripts/render_chaotic_bars.py --ffmpeg <ffmpeg-executable>`.

`check_feature_catalog.js` is the Node CLI and assertion layer for the reviewed
`src/features/catalog.json`. It runs before npm builds and is exercised by
`test/feature_catalog.test.js`. It requires the surrounding Fracto checkout for
the catalog's cross-repository evidence references.

`catalog_source_facts.js` parses JSX and resolves only literal registry metadata
using the declared Babel development dependency. It reads source syntax without
executing modules. `catalog_navigation.js` maps those bindings to routes, sidebar
destinations, labels, titles and direct panel setting references. Unsupported
dynamic expressions fail rather than being executed or silently omitted.

These source tools validate metadata. The npm prebuild then invokes the root
`build_knowledge_bundle.js` command, which renders and publishes the deterministic
artifact without opening a knowledge store or skill registry. See
`../src/features/README.md` for catalog fields and update procedure.

inventory:probe-fbx <asset-id> [UI origin] [category] runs the UI FBX parser and
resource URL resolver against the live catalog/proxy, fetching actual referenced
image files. It substitutes texture construction to run without a browser/GPU;
this verifies geometry and texture delivery, not WebGL rendering. Defaults are
localhost port 3006 and material. It prints counts only and modifies no assets.

inventory_preview_validation.html?id=ASSET_ID&category=material is a read-only
browser probe served by Vite. It uses the real model loader and scene through the
UI catalog proxy, checks morph movement and counts WebGL errors, then exercises
roughness and animation toggles. The final JSON appears below the canvas. It
never edits catalog records. This complements the headless FBX resource probe.

The generic environment catalog proxy also relays POST /import/inspect. Archive
model discovery and codec validation remain entirely in the asset service.
