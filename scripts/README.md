# UI data preparation

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
