# Contract fixtures

`path-motion.html` loads the real saved grass base and separate motion file into
the production Play renderer. Seek buttons preview stops, either half-turn and
reverse travel in seconds, without changing model records or speeding up the
production route. It exercises the same camera crop, shadows and material clocks.

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
