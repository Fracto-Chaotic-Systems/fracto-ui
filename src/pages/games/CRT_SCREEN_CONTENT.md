# Context-driven CRT screen

`GamesPlay` accepts `crt_content`, passed to `GamesCrt` as `screen_content`. Keep
the descriptor stable until the game context changes (for example with useMemo).
Changing it updates only the display compositor, not the rig, camera or WebGL
renderer. Omitting it on Game Play selects the random public media playlist.
An unconfigured standalone `GamesCrt` still shows the face with static bursts.

`GamesCrt` also supplies the AppText broadcast messages through the compositor's
`broadcast: { message, alert }` creation option. This strip is painted after all
media/static and before the glass finish, using the screen-lifetime clock rather
than the per-content clock. Content changes and static do not restart the loop.
After the full white-on-blue crawl exits, the centered red-on-white alert blinks
for six seconds before the crawl restarts. Standalone compositors omit the strip
unless this option is supplied.
`GamesCrt` also supplies `static_flash`, an AppText title shown on one display
frame near the middle of a randomly selected static burst (35% chance per burst).
It is composited before the broadcast strip and glass, and disabled under
reduced motion. The title card does not reset either the media or message clock.
The optional `translations` array contains `{ message, deploy, language, direction }`
entries. Crawls start in English and alternate with random translated entries,
avoiding the previous translated entry when possible. Duration uses the current
message's measured width; RTL entries scroll in the opposite direction. The
optional `random` function supports deterministic selection in tests.
`deploy` supplies the matching alert translation, displayed with that crawl's
text direction. English turns use the top-level `alert` message. Alert text fits
within the strip width while retaining the same font height and blink timing.

## Default Game Play playlist

`crt_screen_media_plugin.js` discovers browser images and MP4 files directly in
`public/screens` and exposes their encoded public URLs as a virtual module.
Adding/removing supported files refreshes the catalog in development; rebuild
the production UI to include catalog changes there. AVI files and documentation
are excluded. The files stay in public storage rather than becoming JS imports.
The dev server also checks the directory every three seconds, so missed Windows/
Docker watcher events do not require a manual restart. A changed catalog refreshes
the page and starts a fresh shuffled bag containing the newly added media.
For a legacy MP4 codec, a same-stem `.browser.mp4` copy takes precedence over
the original in the catalog. `rbFlight.browser.mp4` supplies H.264 playback for
the original MPEG-4 Part 2 clip without duplicating its playlist entry.

`CrtScreenPlaylist.js` shuffles all media into a bag, visits every file before
reshuffling, and avoids repeating the last file at a bag boundary. The face
appears initially and between every selection for 2.8–5.8 seconds. Images last
4.5–8.5 seconds; muted video segments last 8–14 seconds (short clips loop).
The independent interference clock occasionally interrupts any selection with
brief static, without resetting at each playlist transition.

Only the selected file is loaded. Replacing it releases its media element;
hidden/offscreen and reduced-motion states pause automatic progression. The
playlist, fit and screen-click interaction all share the existing moving glass.

Custom game content still overrides the playlist:

```jsx
<GamesPlay crt_content={{ layers: [{ type: "face" }], interference: true }} />
```

Alternatively supply `{playlist: [{type: "image", source: "/screens/Logo.jpg"},
{type: "video", source: "/screens/rbFlight.mp4"}]}` for a contextual subset.

All content is painted into the existing 512 by 384 CanvasTexture, shared by the
curved glass mesh's color and emissive maps. UV mapping and the head hierarchy
apply curvature, perspective, swivel, tilt and extension to every source equally.
There are no separately positioned HTML images or videos above the screen.

## Layers

```jsx
const crt_content = {
  background: "#03120f",
  layers: [
    { type: "image", source: "/game/briefing.webp", fit: "contain" },
    {
      type: "video",
      source: "/game/transmission.webm",
      fit: "cover",
      opacity: 0.75,
    },
    {
      type: "animation",
      draw(ctx, { time, dt, width, height, pointer, reduced_motion }) {
        ctx.fillStyle = "#80ffd0";
        ctx.fillRect(width * 0.1, height * 0.9, width * 0.8, 4);
      },
    },
    { type: "static", opacity: 0.1, blend: "screen" },
  ],
};
return <GamesPlay crt_content={crt_content} />;
```

Layer types are `face`, `static`, `image`, `video`, and `animation`. Layers are
painted in order, each with isolated canvas state. Optional `opacity` is 0–1,
`blend` is a Canvas 2D composite operation, and `rect` is a normalized destination
region `{x, y, width, height}`. The region clips its contents. Animation callbacks
receive the destination region's pixel width and height (512 by 384 for the full
screen), plus screen time, paint delta, pointer and reduced-motion state. Capture
game-specific values in the callback closure.

Images and video preserve aspect ratio. `contain` is the default (letterboxing);
`cover` crops to fill. Sources can be URLs or caller-owned image/video/canvas/
ImageBitmap objects. A playing video or changing source canvas supplies new frames
on each paint. Use video or a synchronous drawing callback for timed animation.

Portrait images automatically override the static fit: they zoom to fill the
screen with the upper half (or a tighter upper section for very tall images),
hold briefly, then ease downward until the bottom edge is visible. The final
bottom view holds before the playlist advances. The original aspect ratio is
preserved; cropping happens within the existing curved glass texture.
The playlist gives images 9–17 seconds and sets `pan_duration` to that dwell
time, allowing a slower top-to-bottom scan. Standalone
images default to twelve seconds; set `portrait_pan:false` to retain static
contain/cover fitting. The per-content clock resets on every selection and
continues through static interruptions, so scrolling finishes before the item
changes. Reduced motion holds the top crop without auto-scrolling.

Image layers can instead use `zoom_out: { x, y, width }`, where the coordinates
are a normalized source focal point and `width` is the initial visible fraction
of the source width. This overrides portrait scrolling, holds the close-up for
one second, then eases out to contain the entire image with a two-second final
hold. It shares `pan_duration` and the content clock. Reduced motion shows the
whole image immediately. The playlist gives `/screens/Image3.jpg` an 18–24 second
reveal focused on its upper blank face at `(0.4, 0.2)`, starting at 25% width.

URL media is loaded with anonymous CORS; URL video is muted, inline and looping
unless `loop:false` is specified. Use same-origin URLs or servers allowing CORS.
Media is checked for origin cleanliness before touching the shared texture.
Animation callbacks and source canvases must also remain origin-clean; if their
media changes after initialization, provide a new content descriptor.

The compositor owns URL media: it pauses video when the rig is hidden or reduced
motion is enabled, resumes when appropriate, and releases sources/listeners on
replacement or unmount. Caller-owned media keeps its existing playback/stream
ownership; the caller handles its playback and disposal. Loading/failed media
falls back to the face if no other layer draws. Media errors and callback errors
are reported once per failing layer/source without stopping the mechanical rig.

## Static cadence and lifecycle

The default face is interrupted after randomly chosen 3.4–7.8 second intervals,
with 0.22–0.68 second static bursts, then returns to the face. Static uses moderate
luminance grain and a moving tracking band rather than full-screen flashes.
Custom content is uninterrupted unless its descriptor sets `interference:true`;
explicit static layers can instead be mixed with selected opacity and blend.

The screen runs at the rig's existing paint rate, without per-frame React state
updates or separate timers. Hidden/offscreen time does not advance the cadence.
Reduced motion suppresses automatic interruptions and blinking, freezes explicit
static, and renders only on user/content/resize/load updates. All media listeners
and owned playback are released with the compositor.

`CrtScreen.js` owns composition, `CrtScreenEffects.js` owns face/glass/static and
the interference schedule, and `CrtScreenMedia.js` owns source fitting/loading.
`CrtMotion.js` now handles only mechanical poses and cables.

## Verification

Run `npm run test:crt` (or the matching `node --test` command) from the UI root.
`/scripts/crt_screen_preview.html` mounts the production TV with image, local live
video, animation, static, mixed, playlist, portrait and library-video modes; no backend or
remote media is required. Library video uses an actual MP4 from `public/screens`.
Use its selector, move the pointer and click the glass to inspect tracking in
both poses. The default mode on the actual Game Play page uses the same compositor.
