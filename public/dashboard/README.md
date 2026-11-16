# Dashboard texture assets

Local 1024 × 1024 WebP color maps used by the game dashboard. These are derived
from ambientCG's 1K JPG material downloads, encoded at quality 82 with Pillow.
Only the color map is shipped; no normal, displacement, or roughness maps are needed.

| File           | Source                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| woodgrain.webp | [Wood 051](https://ambientcg.com/view?id=Wood051)                                                                                  |
| metal.webp     | [Metal 010](https://ambientcg.com/view?id=Metal010)                                                                                |
| wicker.webp    | [Wicker 010 A](https://ambientcg.com/view?id=Wicker010A)                                                                           |
| pearl.webp     | [Iridescent Fluid Abstract](https://www.publicdomainpictures.net/en/view-image.php?image=823537&picture=iridescent-fluid-abstract) |

The woodgrain, metal, and wicker assets are by ambientCG / Lennart Demes and released under
[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
Copying, modification, commercial use, and redistribution of the raw files are
permitted; attribution is optional. See [ambientCG's license information](https://docs.ambientcg.com/license/).
Sources and license verified November 16, 2026.

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
Wood051_1K-JPG.zip    debf3d60f69a09c30613dc95a94da49c8116160ab8a29f77ac8e32cc33f1a1c3
Metal010_1K-JPG.zip   01b03853f1937aaa98870228912f7f73eb574af3b12035b7b4e1fd879a6039ea
Wicker010A_1K-JPG.zip 8d56e864348665357568a7c5f2a09dcdce11ddfb76025266919c40d29a8cb3d9
```
