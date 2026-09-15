# Video Record Schema

This document is the evolving reference for the `videos` table and the JSON
documents stored in its `meta` and `script` fields. It intentionally starts as
scaffolding; each capability should extend the relevant section together with
its version migration and fixtures.

## Database record

| Field | Type | Description |
| --- | --- | --- |
| `id` | integer | Stable video-project identifier. |
| `title` | string | User-visible project title. |
| `created_at` | timestamp | Record creation time. |
| `updated_at` | timestamp | Most recent persisted update. |
| `archived` | boolean | Soft-delete marker; `false` by default. |
| `meta` | JSON object | Technical rendering and output configuration. |
| `script` | JSON object | Ordered motion and frame instructions. |
| `meta_version` | integer | Version of the `meta` document, when independently versioned. |
| `script_version` | integer | Version of the `script` document, when independently versioned. |

The existing `assets` table is also checked during asset-server startup. Its
schema is owned by the asset server and is initialized through the data server
in the same idempotent manner.

If the implementation uses one record-wide version instead, document that
choice here as `schema_version` and remove the unused version columns from the
database design.

## `meta`

Current version: **not yet defined**

The initial `meta` object contains the project description and basic output
dimensions and timing. These are JSON properties, not additional columns in
the `videos` table.

| Property | Type | Description |
| --- | --- | --- |
| `description` | string | User-authored description of the video project. |
| `frame_size` | integer | Width and height of the square output frame, in pixels. |
| `frame_rate` | number | Output frame rate, in frames per second. |
| `format` | enum string | Container format: `mp4`, `webm`, `mov`, or `mkv`. |
| `codec` | enum string | Video codec: `h264`, `hevc`, `vp9`, or `av1`. |
| `pixel_format` | enum string | Pixel encoding, such as `yuv420p`, `yuv444p`, or `rgba`. |
| `bitrate` | integer or null | Target video bitrate in bits per second. |
| `quality` | number or null | Codec-specific quality value, such as CRF. |
| `aspect_ratio` | number | Display width-to-height ratio. |
| `duration` | number or null | Expected runtime in seconds; null when derived from the script. |
| `audio` | object | Audio output configuration; see the nested shape below. |
| `color_space` | object | Color interpretation metadata; see the nested shape below. |
| `keyframe_interval` | integer or null | Maximum number of frames between keyframes. |
| `output_extension` | enum string or null | Preferred output suffix: `mp4`, `webm`, `mov`, or `mkv`. |
| `output_uri` | string or null | Destination URI or path for generated output. |
| `thumbnail` | object | Poster-frame or preview configuration. |
| `render_engine` | string or null | Renderer identifier, such as `fracto-raster`. |
| `capability_version` | string or null | Version of the renderer capability set used. |
| `created_by` | string or null | User or process that created the project. |
| `updated_by` | string or null | User or process that most recently changed the project. |

The initial shape is:

```json
{
  "description": "",
  "frame_size": 1024,
  "frame_rate": 30,
  "format": null,
  "codec": null,
  "pixel_format": null,
  "bitrate": null,
  "quality": null,
  "aspect_ratio": 1,
  "duration": null,
  "audio": {
    "enabled": false,
    "codec": null,
    "sample_rate": null,
    "channels": null,
    "frequency": null
  },
  "color_space": {
    "primaries": null,
    "transfer": null,
    "matrix": null,
    "range": null
  },
  "keyframe_interval": null,
  "output_extension": null,
  "output_uri": null,
  "thumbnail": {
    "enabled": false,
    "frame_index": null,
    "output_uri": null
  },
  "render_engine": null,
  "capability_version": null,
  "created_by": null,
  "updated_by": null
}
```

The `audio.codec` value is an enum such as `pcm_s16le`, `aac`, `opus`, or
`flac`; `audio.sample_rate` is an integer in hertz; `audio.channels` is an
integer count; and `audio.frequency` is the source tone in hertz when a test
waveform is included. The `color_space` members are enum strings (for
example, `bt709`, `srgb`, `gamma22`, or `full`), and `color_space.range` is
either `full` or `limited`. `thumbnail` contains a boolean `enabled`, an
integer `frame_index`, and an optional destination URI.

The defaults above are the initial application defaults. Future properties
must remain optional for older records and be supplied through normalization
when absent.

## `script`

Current version: **not yet defined**

The `script` object contains an ordered `steps` array. At the current minimal
schema, each step identifies a focal point and scope for that portion of the
video path:

| Property | Type | Description |
| --- | --- | --- |
| `steps` | array | Ordered video path steps; defaults to an empty array. |
| `steps[].focal_point` | object | Complex-plane location with numeric `x` and `y` coordinates. |
| `steps[].scope` | number | Width of the rendered complex-plane region for the step. |

```json
{
  "steps": [
    {
      "focal_point": { "x": -0.75, "y": 0.0001 },
      "scope": 2.5
    }
  ]
}
```

Additional frame-specific properties may be added later. They must remain
optional until their defaults and migration behavior are documented, so this
minimal shape remains readable by older consumers.

## Version history

| Version | Document | Change | Migration notes |
| --- | --- | --- | --- |
| - | - | No persisted schema version has been established yet. | - |

## Schema maintenance

When adding or changing a field, update this document with its type, units,
default, valid range, and version. Add a fixture for the prior shape and a
test proving that older records normalize to the current in-memory shape.
