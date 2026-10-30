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
