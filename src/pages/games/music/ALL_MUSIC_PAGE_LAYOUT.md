# Layout of the All Music Page

This document describes the design and operation of the "All Music" page, which is used to play and edit midi files for game development.

## Requirements

In addition to the existing features, which include loading and playing midi files, the following extended features should be introduced (details further on):

1. **Persistent cataloging and midi file storage.**
Files can be saved to the `fracto-asset-server` repo and cataloged in a dedicated database table
2. **Midi file meta data refinement.**
Various text elements found in the midi files should be presented to the user as the basis of notes to be stored in the catalog
3. **Selection from the library catalog.**
Midi files should be selectable from the exisiting catalog of user-selected midi files which are version controlled by git
4. **Midi file editing.**
Basic instrument changes to start, leading to more extensive additions and changes to midi content.

## Page Design
