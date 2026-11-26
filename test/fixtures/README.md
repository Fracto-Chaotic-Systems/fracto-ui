# Contract fixtures

`game-play-flow.html` mounts the real Play page in StrictMode with normal game
text and settings initialization. Use settings → control → Reset game to enter
  the audio-synchronized WELCOME/to/CHAOS sequence (0.47s/2.87s/4.17s in the
  TwelveNoteFugue soundtrack); wait for its completion or click anywhere
  in the game area to skip to the background and TV. Only activating the final
  white message starts a new interactive session. The GAME PLAY title remains
  visible above the game area throughout. It
uses the development service endpoints for runtime assets and flight rendering.

`path-motion.html` loads the published grass package and separate motion file into
the production Play renderer. Seek buttons preview stops, either half-turn and
reverse travel in seconds, without changing model records or speeding up the
production route. It exercises the same camera crop, shadows and material clocks.
Optional `?manifest=URL` selects the same pinned manifest on a file-only runtime
server, proving WebGL playback without authoring API availability.

`sparse-grass-shadows.html` is a read-only live WebGL regression using the saved
component's actual sparse-grass model, scale and alpha texture. It compares lit
floor pixels with casting disabled/enabled, outside the plant footprint, for
whole-strip versus view-focused shadow coverage. Open it through Vite at
`/test/fixtures/sparse-grass-shadows.html` with the data/asset services running.
The focused 20m case must retain shadow pixels; full-strip fitting reproduces
the lost sub-texel shadows. No component or material records are modified.

`ui-provider.json` is a reviewed provider-contract snapshot for the shared
knowledge validator tests. UI tests use this local input rather than reading AI
service implementation/configuration files. The generated bundle integration
validates the current published catalog independently.

## Grass asset optimization comparison

`grass-optimization.html#base=URL` compares the original and optimized published
grass at identical camera, lighting and manually stepped animation times. `URL`
is the URL-encoded `/component-runtime` prefix of the file-only server. The fixture
checks matching morph weights and framebuffer bytes (including shadows); it
performs no authoring calls or writes. It is a manual verification fixture.

## Component arrival fade

`component-reveal.html#base=URL` uses the real published grass and reveal shaders.
`URL` is the URL-encoded file server's `/component-runtime` prefix. It verifies
hidden plants cast no shadows, intermediate coverage is visible, and completed
fades restore the exact framebuffer. Controls freeze the reveal or replay its
1.2-second transition. No component or material records are modified.
