# Dashboard texture assets

`night-flight-switch.png` is a transparent two-state sprite derived from the
user-provided switch photograph using the built-in image editor. The left image
is **off** and the right is **on**; original ON/OFF lettering and metallic highlights
are retained. `NightFlightSwitch.jsx` crops each state in CSS, preserving alpha
against every dashboard finish. This user-supplied asset is separate from the
CC0 texture sources listed below; no third-party license is asserted for it.

Edit prompt: “Remove only the plain white surroundings, including the gap between
the switches, to genuine transparency. Preserve both photographic switches,
positions, metal highlights, proportions, and ON/OFF lettering; left off, right on.”

Local 1024 × 1024 WebP color maps used by the game dashboard. These are derived
from Poly Haven and ambientCG 1K JPG color maps, encoded at quality 82 with Pillow.
Only the color map is shipped; no normal, displacement, or roughness maps are needed.

| File           | Source                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| woodgrain.webp | [Oak Veneer 01](https://polyhaven.com/a/oak_veneer_01)                                                                             |
| metal.webp     | [Metal 011](https://ambientcg.com/view?id=Metal011)                                                                                |
| wicker.webp    | [Wicker 010 A](https://ambientcg.com/view?id=Wicker010A)                                                                           |
| pearl.webp     | [Iridescent Fluid Abstract](https://www.publicdomainpictures.net/en/view-image.php?image=823537&picture=iridescent-fluid-abstract) |

The woodgrain texture is **Oak Veneer 01** by Jenelle van Heerden / Poly Haven,
replacing the previous dark Wood051 texture. The 1K diffuse image is encoded to
88,404 bytes. Source JPEG: https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/oak_veneer_01/oak_veneer_01_diff_1k.jpg
Source SHA-256: `c14681f72f59f17bff568cae7a837641443b607b899f0c279cd64a5638f877a7`.
See [Poly Haven's CC0 license](https://polyhaven.com/license).

The metal and wicker assets are by ambientCG / Lennart Demes and released under
[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
Copying, modification, commercial use, and redistribution of the raw files are
permitted; attribution is optional. See [ambientCG's license information](https://docs.ambientcg.com/license/).
Sources and license verified November 16, 2026.

Metal 011 replaces Metal 010 with the selected finer brushed-steel finish.
Its optimized color map is 32,084 bytes. A separate broad reflected-light layer
travels across the dashboard every 32 seconds in alternating directions. It is
less intense during night flight and static when reduced motion is preferred.

`pearl.webp` is derived from the AI Generated contributor's **Iridescent Fluid
Abstract** on Public Domain Pictures, released as CC0 public domain. The standard
1920 × 1074 JPEG was encoded as WebP at quality 85 (79,212 bytes).
Source JPEG: https://www.publicdomainpictures.net/pictures/830000/velka/iridescent-fluid-abstract-1789015260wsk.jpg
Source SHA-256: `dd9ad4d1e8bac0c8c0d289db8de98be1e24680b814354e04ed122ef5e1f715b4`.
This image is not seamless: the dashboard oversizes it and drifts within its
bounds without repeating, reversing smoothly at the image edges every 45 seconds.
The rim and lighting remain stationary.

Regenerate with `python scripts/dashboard-textures.py` from the UI repository
(requires Pillow for asset preparation only). The script prints source archive
SHA-256 checksums and output sizes. It reads only the named color map from each ZIP.

Source archive SHA-256 checksums for this import:

```text
Metal011_1K-JPG.zip   d366e840e8361182fc69a5657e71bee762646ec54c2473abf921ecae57fa4b8c
Wicker010A_1K-JPG.zip 8d56e864348665357568a7c5f2a09dcdce11ddfb76025266919c40d29a8cb3d9
```
