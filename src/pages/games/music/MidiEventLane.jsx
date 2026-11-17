import { memo, useEffect, useRef } from "react";
import AppText from "../../../AppText.jsx";
import { MUSIC_TEXT } from "../../../text/GamesText.jsx";
import { visible_track_notes, TRACK_ROW_HEIGHT } from "./MidiTrackGeometry.js";
import { event_at_time } from "./MidiTrackPlayback.js";
import {
  TrackLabel,
  TrackCell,
  SustainLabelHeader,
  EventLabelHeader,
  TrackChannelNumber,
} from "./MidiTrackStyles.jsx";

const text = (key) => AppText.get(MUSIC_TEXT[key]);
export function event_lane_value(lane, event) {
  if (lane.kind === "tempo")
    return `${Number((60000000 / event.microseconds_per_quarter).toFixed(2))} ${text("bpm")}`;
  if (lane.kind === "meter") return `${event.numerator}/${event.denominator}`;
  return event?.down ? text("pedal_down") : text("pedal_up");
}
function LaneCanvas({ lane, width, scale, scroll, height }) {
  const ref = useRef(null);
  useEffect(() => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2),
      canvas = ref.current;
    canvas.width = Math.ceil(width * ratio);
    canvas.height = height * ratio;
    const context = canvas.getContext("2d");
    context.scale(ratio, ratio);
    context.fillStyle = "#f8fafb";
    context.fillRect(0, 0, width, height);
    context.font =
      lane.kind === "pedal" ? "italic 12px monospace" : "12px monospace";
    const spans = visible_track_notes(
      lane.index,
      scroll / scale,
      (scroll + width) / scale,
    );
    // One label per visual column for dense metadata at the same instant.
    let last_label = -Infinity;
    for (const span of spans) {
      const x = Math.max(0, span.start_seconds * scale - scroll),
        end = Math.min(width, span.end_seconds * scale - scroll);
      if (end <= x) continue;
      context.fillStyle =
        lane.kind === "pedal"
          ? "#e4bd83"
          : span.inferred
            ? "#e7ecf1"
            : "#d6e5ed";
      context.fillRect(x, 8, end - x, height - 16);
      context.fillStyle = "#7b8c99";
      context.fillRect(x, 8, 1, height - 16);
      if (end - x > 48 && x - last_label > 55) {
        context.fillStyle = "#344350";
        context.fillText(
          event_lane_value(lane, span),
          x + 5,
          height / 2 + 4,
          Math.max(1, end - x - 10),
        );
        last_label = x;
      }
    }
    context.fillStyle = "#b4bec7";
    context.fillRect(0, height - 1, width, 1);
  }, [lane, width, scale, scroll, height]);
  return <canvas ref={ref} aria-hidden="true" style={{ width, height }} />;
}
const StaticLaneCanvas = memo(LaneCanvas);
function MidiEventLane({
  lane,
  width,
  scale,
  scroll,
  position,
  height = TRACK_ROW_HEIGHT,
}) {
  const event = event_at_time(lane.events, position);
  const title =
    lane.kind === "pedal" ? text("pedal_lane") : text(`${lane.kind}_lane`);
  const value = lane.events.length
    ? event_lane_value(lane, event)
    : text("no_pedal_events");
  const inferred = lane.kind !== "pedal" && event?.inferred;
  return (
    <>
      <TrackLabel
        as="div"
        style={{ cursor: "default", height }}
        data-event-lane={lane.kind}
        data-channel={lane.channel ?? ""}
        title={`${title}: ${value}${inferred ? ` (${text("inferred")})` : ""}`}
      >
        {lane.kind === "pedal" && lane.channel !== null ? (
          <SustainLabelHeader>
            <TrackChannelNumber
              aria-label={text("channel_number").replace(
                "{channel}",
                String(lane.channel + 1),
              )}
            >
              {lane.channel + 1}
            </TrackChannelNumber>
            <strong>{title}</strong>
            <em>{value}</em>
          </SustainLabelHeader>
        ) : (
          <EventLabelHeader>
            <strong>{title}</strong>
            <em>
              {value}
              {inferred ? ` (${text("inferred")})` : ""}
            </em>
          </EventLabelHeader>
        )}
      </TrackLabel>
      <TrackCell>
        <StaticLaneCanvas
          lane={lane}
          width={width}
          scale={scale}
          scroll={scroll}
          height={height}
        />
      </TrackCell>
    </>
  );
}
export default memo(MidiEventLane);
