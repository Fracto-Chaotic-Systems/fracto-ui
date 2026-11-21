"""Render an original pixel-art Pong rally to an H.264 MP4 using only stdlib + FFmpeg."""

import argparse
import math
from pathlib import Path
import random
import shutil
import subprocess

WIDTH, HEIGHT = 640, 480
INK = (227, 237, 220)
BACKGROUND = bytes((7, 11, 9)) * (WIDTH * HEIGHT)
DIGITS = {
    "0": ("111", "101", "101", "101", "111"),
    "1": ("010", "110", "010", "010", "111"),
    "2": ("111", "001", "111", "100", "111"),
    "3": ("111", "001", "111", "001", "111"),
    "4": ("101", "101", "111", "001", "001"),
    "5": ("111", "100", "111", "001", "111"),
    "6": ("111", "100", "111", "101", "111"),
    "7": ("111", "001", "010", "010", "010"),
    "8": ("111", "101", "111", "101", "111"),
    "9": ("111", "101", "111", "001", "111"),
}


def rectangle(frame, x, y, width, height, color=INK):
    left, top = max(0, round(x)), max(0, round(y))
    right, bottom = min(WIDTH, round(x + width)), min(HEIGHT, round(y + height))
    if right <= left or bottom <= top:
        return
    row = bytes(color) * (right - left)
    for line in range(top, bottom):
        offset = (line * WIDTH + left) * 3
        frame[offset : offset + len(row)] = row


def score(frame, value, x):
    for digit in str(value):
        for y, row in enumerate(DIGITS[digit]):
            for column, pixel in enumerate(row):
                if pixel == "1":
                    rectangle(frame, x + column * 8, 30 + y * 8, 8, 8)
        x += 32


def approach(position, target, speed, dt):
    return position + max(-speed * dt, min(speed * dt, target - position))


def render(output, ffmpeg, seconds=16, fps=30):
    if output.exists():
        raise FileExistsError(f"Refusing to replace {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    staging = output.with_name(f".{output.stem}.part")
    if staging.exists():
        raise FileExistsError(f"Unfinished output already exists: {staging}")
    command = [
        ffmpeg, "-hide_banner", "-loglevel", "warning", "-nostdin", "-n",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}",
        "-r", str(fps), "-i", "pipe:0", "-an", "-c:v", "libx264",
        "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-threads", "4", "-movflags", "+faststart", "-f", "mp4", str(staging),
    ]
    randomizer = random.Random(71)
    ball_x, ball_y, velocity_x, velocity_y = WIDTH / 2, HEIGHT / 2, 245.0, 158.0
    left_y, right_y, paddle_h = HEIGHT / 2, HEIGHT / 2, 76
    left_score = right_score = hits = 0
    pause = 0.55
    dt = 1 / fps
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        for index in range(round(seconds * fps)):
            time = index * dt
            left_target = ball_y + math.sin(time * 2.1) * 17
            right_target = ball_y + math.sin(time * 1.7) * 23
            # A deliberate late defensive miss gives the short clip a scored point.
            if 7 < time < 11 and velocity_x > 0:
                right_target = 68 if ball_y > HEIGHT / 2 else HEIGHT - 68
            left_y = approach(left_y, left_target, 235, dt)
            right_y = approach(right_y, right_target, 225, dt)
            left_y = max(58, min(HEIGHT - 58, left_y))
            right_y = max(58, min(HEIGHT - 58, right_y))
            if pause > 0:
                pause -= dt
            else:
                previous_x = ball_x
                ball_x += velocity_x * dt
                ball_y += velocity_y * dt
                if ball_y < 21 or ball_y > HEIGHT - 21:
                    ball_y = max(21, min(HEIGHT - 21, ball_y))
                    velocity_y *= -1
                for paddle_x, paddle_y, sign in [(48, left_y, 1), (WIDTH - 48, right_y, -1)]:
                    crossing = previous_x > paddle_x >= ball_x if sign == 1 else previous_x < paddle_x <= ball_x
                    if crossing and abs(ball_y - paddle_y) < paddle_h / 2 + 5:
                        ball_x = paddle_x + sign * 6
                        velocity_x = sign * min(335, abs(velocity_x) * 1.035)
                        velocity_y = (ball_y - paddle_y) * 5.0 + velocity_y * 0.4
                        hits += 1
                if ball_x < -10 or ball_x > WIDTH + 10:
                    if ball_x < 0:
                        right_score += 1
                    else:
                        left_score += 1
                    direction = -1 if ball_x > WIDTH else 1
                    ball_x, ball_y = WIDTH / 2, HEIGHT / 2
                    velocity_x = direction * 245
                    velocity_y = randomizer.choice([-1, 1]) * randomizer.uniform(105, 175)
                    pause = 0.65
            frame = bytearray(BACKGROUND)
            rectangle(frame, 20, 15, WIDTH - 40, 3)
            rectangle(frame, 20, HEIGHT - 18, WIDTH - 40, 3)
            for y in range(24, HEIGHT - 24, 24):
                rectangle(frame, WIDTH / 2 - 2, y, 4, 12, (130, 148, 129))
            score(frame, left_score, 250)
            score(frame, right_score, 366)
            rectangle(frame, 36, left_y - paddle_h / 2, 9, paddle_h)
            rectangle(frame, WIDTH - 45, right_y - paddle_h / 2, 9, paddle_h)
            rectangle(frame, ball_x - 5, ball_y - 5, 10, 10)
            process.stdin.write(frame)
        process.stdin.close()
        if process.wait() != 0:
            raise RuntimeError("FFmpeg failed to encode Pong")
    finally:
        if process.poll() is None:
            process.kill()
            process.wait()
    # Only publish a complete, decodable MP4 to the watched media folder.
    subprocess.run([ffmpeg, "-hide_banner", "-v", "error", "-nostdin", "-i", str(staging), "-f", "null", "-"], check=True)
    staging.rename(output)
    print(f"Created {output}: {seconds:g}s, {fps:g} fps, {WIDTH}x{HEIGHT}, {output.stat().st_size:,} bytes; {hits} paddle hits; score {left_score}-{right_score}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parent.parent / "public/screens/pong.mp4")
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg"))
    parser.add_argument("--seconds", type=float, default=16)
    parser.add_argument("--fps", type=int, default=30)
    arguments = parser.parse_args()
    if not arguments.ffmpeg:
        parser.error("Provide --ffmpeg <executable> or put FFmpeg on PATH")
    if not 1 <= arguments.seconds <= 120 or not 1 <= arguments.fps <= 60:
        parser.error("Use 1-120 seconds and 1-60 fps")
    render(arguments.output.resolve(), arguments.ffmpeg, arguments.seconds, arguments.fps)
