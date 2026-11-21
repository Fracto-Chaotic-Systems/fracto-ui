const FACE = { layers: [{ type: "face" }], interference: true };

// A shuffled bag visits every file before recycling. Face interludes and an
// independent interference clock prevent a regular slideshow-like cadence.
export function create_crt_playlist(media, { random = Math.random } = {}) {
  const items = [
    ...new Map(
      media
        .filter(
          (item) =>
            (item.type === "image" || item.type === "video") &&
            typeof item.source === "string",
        )
        .map((item) => [item.source, item]),
    ).values(),
  ];
  const roll = () => Math.max(0, Math.min(0.999999, Number(random()) || 0));
  const duration = (min, max) => min + roll() * (max - min);
  let bag = [],
    last_source,
    content = FACE,
    remaining = duration(2.8, 5.8);
  const next_media = () => {
    if (!bag.length) {
      bag = [...items];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(roll() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag.length > 1 && bag[bag.length - 1].source === last_source) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
    }
    const item = bag.pop();
    last_source = item.source;
    const face_reveal =
      item.type === "image" &&
      item.source.toLowerCase() === "/screens/image3.jpg";
    const dwell = face_reveal
      ? duration(18, 24)
      : item.type === "video"
        ? duration(8, 14)
        : duration(9, 17);
    content = {
      layers: [
        {
          ...item,
          fit: "contain",
          loop: true,
          ...(item.type === "image" ? { pan_duration: dwell } : {}),
          ...(face_reveal ? { zoom_out: { x: 0.4, y: 0.2, width: 0.25 } } : {}),
        },
      ],
      interference: true,
    };
    return dwell;
  };
  return {
    advance(dt, enabled = true) {
      if (!enabled || !items.length) return content;
      remaining -= Math.max(0, Math.min(60, Number(dt) || 0));
      while (remaining <= 0) {
        if (content === FACE) remaining += next_media();
        else {
          content = FACE;
          remaining += duration(2.8, 5.8);
        }
      }
      return content;
    },
    get content() {
      return content;
    },
    get remaining() {
      return remaining;
    },
  };
}
