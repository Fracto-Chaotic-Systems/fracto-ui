"""Download CC0 dashboard color maps and encode WebP assets.

Requires Pillow (build-time only): python -m pip install Pillow
Run from any directory: python scripts/dashboard-textures.py
"""

from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
from urllib.request import Request, urlopen
from zipfile import ZipFile

from PIL import Image

OUTPUT = Path(__file__).resolve().parents[1] / "public" / "dashboard"
ASSETS = {"metal": "Metal011", "wicker": "Wicker010A"}
PEARL_URL = "https://www.publicdomainpictures.net/pictures/830000/velka/iridescent-fluid-abstract-1789015260wsk.jpg"


def build_woodgrain():
    headers = {"User-Agent": "Fracto dashboard asset preparation"}
    with urlopen(Request("https://api.polyhaven.com/files/oak_veneer_01", headers=headers), timeout=120) as response:
        url = json.load(response)["Diffuse"]["1k"]["jpg"]["url"]
    with urlopen(Request(url, headers=headers), timeout=120) as response:
        source = response.read()
    with Image.open(BytesIO(source)) as image:
        image.convert("RGB").save(OUTPUT / "woodgrain.webp", "WEBP", quality=82, method=6)
    path = OUTPUT / "woodgrain.webp"
    return f"woodgrain: {path.stat().st_size} bytes; source {url}; source JPG SHA-256 {sha256(source).hexdigest()}"


def build_pearl():
    request = Request(PEARL_URL, headers={"User-Agent": "Fracto dashboard asset preparation"})
    with urlopen(request, timeout=120) as response:
        source = response.read()
    with Image.open(BytesIO(source)) as image:
        image = image.convert("RGB")
        image.thumbnail((1920, 1920))
        image.save(OUTPUT / "pearl.webp", "WEBP", quality=85, method=6)
    path = OUTPUT / "pearl.webp"
    return f"pearl: {path.stat().st_size} bytes; source JPG SHA-256 {sha256(source).hexdigest()}"


def build_asset(item):
    finish, asset = item
    url = f"https://ambientcg.com/get?file={asset}_1K-JPG.zip"
    request = Request(url, headers={"User-Agent": "Fracto dashboard asset preparation"})
    with urlopen(request, timeout=120) as response:
        archive_bytes = response.read()
    with ZipFile(BytesIO(archive_bytes)) as archive:
        name = f"{asset}_1K-JPG_Color.jpg"
        with Image.open(BytesIO(archive.read(name))) as image:
            image.convert("RGB").save(OUTPUT / f"{finish}.webp", "WEBP", quality=82, method=6)
    path = OUTPUT / f"{finish}.webp"
    return f"{finish}: {path.stat().st_size} bytes; source ZIP SHA-256 {sha256(archive_bytes).hexdigest()}"


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    print(build_woodgrain())
    with ThreadPoolExecutor(max_workers=3) as executor:
        for result in executor.map(build_asset, ASSETS.items()):
            print(result)
    print(build_pearl())
