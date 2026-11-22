# Inventory runtime assets

`grass-patch-001.glb` is copied from the main repository's
`assets/environments/grass-patch-001/runtime/` folder. Originals and attribution
stay in that local catalog. This public directory contains the runtime model.
The UI reads catalog details through its same-origin catalog endpoint. Edits are
saved directly to the registered source record; no attribution snapshot is
published in this public directory.
After rebuilding it, refresh this copy from the main root with:

```powershell
Copy-Item assets/environments/grass-patch-001/runtime/grass-patch-001.glb servers/fracto-ui/public/inventory/grass-patch-001.glb
```

Scale and material assignments are provisional; see the source asset README.
