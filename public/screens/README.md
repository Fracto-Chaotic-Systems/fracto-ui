# TV screen media

Images and video clips for context-driven playback on the Game
Play CRT. Files in this public folder are served directly by Vite and copied
unchanged into production builds. Existing image filenames are retained.

`13.10.13-06.mp4` and `ntsc.003.upperleft.9x.mp4` are compressed derivatives of
the same-named AVI originals. They use H.264 (CRF 23, slow preset, yuv420p), AAC
stereo audio at 128 kb/s, and MP4 fast-start metadata for browser playback.
The source 720 by 480 dimensions, 4:3 display aspect ratio (8:9 pixel aspect),
and approximately 29.97 fps are preserved. Interlaced frames are deinterlaced
without doubling the frame rate. AVI source files are not needed for playback.

`rbFlight.browser.mp4` is an H.264 fast-start conversion of the original
MPEG-4 Part 2 clip for browser playback. The original is not required here.
When a `.browser.mp4` sibling and an original are both present, the playlist
uses the browser copy to avoid duplicate selections.

`pong.mp4` is an original, silent 16-second pixel-art Pong rally with moving
paddles, wall rebounds, a dashed net and score changes. It is H.264/yuv420p,
640 by 480 at 30 fps, with fast-start metadata. Recreate it with
`scripts/render_pong.py --ffmpeg <ffmpeg-executable>`; the generator uses only
Python's standard library plus FFmpeg and refuses to overwrite existing output.

The generator's source `smpte-color-bars.png` is no longer stored here. To
recreate the lossless 960 by 720 (4:3) classic test pattern, use
[FFmpeg's smptebars source](https://ffmpeg.org/ffmpeg-filters.html#smptebars):
`ffmpeg -f lavfi -i smptebars=size=960x720:rate=1 -frames:v 1 -pix_fmt rgb24 smpte-color-bars.png`.

`smpte-color-bars-chaos.mp4` animates that pattern with irregular randomized
color swaps while preserving its bar and patch geometry. It is a silent,
12-second 640 by 480 H.264/yuv420p clip with fast-start metadata and matching
original-pattern frames at both ends for looping. Recreate the PNG source above
first, then recreate the video with
`python scripts/render_chaotic_bars.py --ffmpeg <ffmpeg-executable>`.

Use `/screens/<filename>` as an image or video source in the screen-content
descriptor documented in `src/pages/games/CRT_SCREEN_CONTENT.md`.
`Image3.jpg` has a custom 18–24 second reveal in the playlist: it starts zoomed
in on the blank face at the top, then slowly zooms out to show the full image.
Game Play automatically includes supported images and MP4s here in its shuffled
TV playlist. The development server refreshes the catalog on additions/removals,
including a three-second polling fallback for missed Docker/Windows file events.
New media joins the refreshed playlist without editing a code list. Production
catalog changes require a new UI build. Non-media files are ignored.
