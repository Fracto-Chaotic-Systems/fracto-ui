# UI data preparation

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
