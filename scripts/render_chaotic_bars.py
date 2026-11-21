"""Shuffle the existing SMPTE pattern's colors into a silent looping MP4."""

import argparse
from itertools import groupby
from pathlib import Path
import random
import shutil
import subprocess


def render(source, output, ffmpeg):
    if output.exists():
        raise FileExistsError(f"Refusing to replace {output}")
    width, height, fps, seconds = 640, 480, 30, 12
    raw = subprocess.check_output([
        ffmpeg, "-v", "error", "-i", str(source), "-vf",
        f"scale={width}:{height}:flags=neighbor", "-frames:v", "1",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1",
    ])
    if len(raw) != width * height * 3:
        raise ValueError("Unexpected source dimensions")
    # Retain the exact pattern geometry, including the lower calibration patches.
    runs = [(color, sum(1 for _ in group)) for color, group in groupby(
        raw[index:index + 3] for index in range(0, len(raw), 3)
    )]
    palette = sorted({color for color, _ in runs if max(color) > 100 and max(color) < 230})
    staging = output.with_suffix(".part.mp4")
    if staging.exists():
        raise FileExistsError(f"Unfinished output exists: {staging}")
    process = subprocess.Popen([
        ffmpeg, "-v", "error", "-nostdin", "-n", "-f", "rawvideo",
        "-pix_fmt", "rgb24", "-s", f"{width}x{height}", "-r", str(fps),
        "-i", "pipe:0", "-an", "-c:v", "libx264", "-preset", "medium",
        "-crf", "18", "-pix_fmt", "yuv420p", "-threads", "4",
        "-movflags", "+faststart", str(staging),
    ], stdin=subprocess.PIPE)
    rng = random.Random(219)
    next_swap, frame = 15, raw
    swaps = 0
    try:
        for index in range(fps * seconds):
            if index >= fps * seconds - 12:
                frame = raw
            elif index >= next_swap:
                shuffled = palette.copy()
                rng.shuffle(shuffled)
                mapping = dict(zip(palette, shuffled))
                frame = b"".join(mapping.get(color, color) * count for color, count in runs)
                next_swap = index + rng.randint(5, 17)
                swaps += 1
            process.stdin.write(frame)
        process.stdin.close()
        if process.wait() != 0:
            raise RuntimeError("Video encoding failed")
    except BaseException:
        process.kill()
        process.wait()
        raise
    subprocess.run([ffmpeg, "-v", "error", "-i", str(staging), "-f", "null", "-"], check=True)
    staging.rename(output)
    print(f"Created {output}: {seconds}s, {width}x{height}, {fps} fps, {swaps} color shuffles")


if __name__ == "__main__":
    screens = Path(__file__).resolve().parents[1] / "public" / "screens"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg"))
    parser.add_argument("--source", type=Path, default=screens / "smpte-color-bars.png")
    parser.add_argument("--output", type=Path, default=screens / "smpte-color-bars-chaos.mp4")
    args = parser.parse_args()
    if not args.ffmpeg:
        parser.error("Provide --ffmpeg or install FFmpeg on PATH")
    render(args.source, args.output, args.ffmpeg)
