import { MainStyles as styles } from "../styles/MainStyles.jsx";
import AppSettings from "../AppSettings.jsx";
import AppText from "../AppText.jsx";
import { TIME_AGO_LOCALE } from "../constants.jsx";
import { KEY_VIEWPORT_DIMENSIONS } from "../settings/RootSettings.jsx";
import LogsBackend from "../backend/LogsBackend.jsx";
import {
  KEY_LOG_GAP,
  KEY_LOG_GAP_DAY,
  KEY_LOG_GAP_HOUR,
  KEY_LOG_GAP_MINUTE,
  KEY_LOG_GAP_SECOND,
} from "../text/RootText.jsx";

const remove_color_codes = (str) => {
  // Regex to match common ANSI escape codes
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
};

export const relative_time = (timestamp) => {
  const elapsed_ms = Date.parse(timestamp) - Date.now();
  if (Number.isNaN(elapsed_ms)) return timestamp;
  const units = [
    ["year", 31536000000],
    ["month", 2592000000],
    ["week", 604800000],
    ["day", 86400000],
    ["hour", 3600000],
    ["minute", 60000],
    ["second", 1000],
  ];
  const [unit, duration] =
    units.find(([, unit_duration]) => Math.abs(elapsed_ms) >= unit_duration) ||
    units[units.length - 1];
  const value = Math.round(elapsed_ms / duration);
  return new Intl.RelativeTimeFormat(TIME_AGO_LOCALE, {
    numeric: "auto",
  }).format(value, unit);
};

const LOG_TIME_GAP_MS = 5 * 60 * 1000;

const highlight_text = (text, search_term, key_prefix) => {
  if (search_term.length < 3) return text;
  const escaped_term = search_term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`(${escaped_term})`, "gi");
  return text.split(matcher).map((part, index) =>
    part.toLowerCase() === search_term.toLowerCase() ? (
      <span
        key={`${key_prefix}-match-${index}`}
        style={{ color: "black", backgroundColor: "yellow" }}
      >
        {part}
      </span>
    ) : (
      part
    ),
  );
};

const segments_by_line = (segments) => {
  const lines = [[]];
  segments.forEach((segment) => {
    segment.text.split(/\r?\n/).forEach((line_part, part_index, parts) => {
      if (line_part)
        lines[lines.length - 1].push({ ...segment, text: line_part });
      if (part_index < parts.length - 1) lines.push([]);
    });
  });
  return lines;
};

const gap_length = (duration_ms) => {
  const units = [
    [KEY_LOG_GAP_DAY, 86400000],
    [KEY_LOG_GAP_HOUR, 3600000],
    [KEY_LOG_GAP_MINUTE, 60000],
    [KEY_LOG_GAP_SECOND, 1000],
  ];
  const [unit_key, duration] =
    units.find(([, unit_duration]) => duration_ms >= unit_duration) ||
    units[units.length - 1];
  return `${Math.round(duration_ms / duration)} ${AppText.get(unit_key)} ${AppText.get(KEY_LOG_GAP)}`;
};

export const render_lines = (
  console_lines,
  timestamps = [],
  styled_segments = [],
  levels = [],
  search_term = "",
) => {
  return console_lines.flatMap((line, i) => {
    const text_line = typeof line === "string" ? line : String(line ?? "");
    let formatted_line = text_line;
    const json_candidate = remove_color_codes(text_line).trim();
    if (
      (json_candidate.startsWith("{") && json_candidate.endsWith("}")) ||
      (json_candidate.startsWith("[") && json_candidate.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(json_candidate);
        if (parsed && typeof parsed === "object") {
          formatted_line = JSON.stringify(parsed, null, 2);
        }
      } catch {
        // Plain-text log messages are rendered as-is.
      }
    }
    const rendered_parts = formatted_line
      .split(/\r?\n/)
      .map((line_part, part_index) => {
        let markedup_line = remove_color_codes(line_part);
        const line_has_match =
          search_term.length >= 3 &&
          markedup_line.toLowerCase().includes(search_term.toLowerCase());
        const segments = formatted_line === line ? styled_segments[i] : null;
        const line_segments = segments?.length
          ? segments_by_line(segments)[part_index]
          : null;
        if (levels[i] === "error") {
          markedup_line = (
            <styles.ErrorLine>
              {highlight_text(
                markedup_line,
                search_term,
                `line-${i}-${part_index}`,
              )}
            </styles.ErrorLine>
          );
        } else if (line_segments?.length) {
          markedup_line = line_segments.map((segment, segment_index) => (
            <span
              key={`segment-${i}-${part_index}-${segment_index}`}
              style={segment.color ? { color: segment.color } : undefined}
            >
              {highlight_text(
                remove_color_codes(segment.text),
                search_term,
                `segment-${i}-${part_index}-${segment_index}`,
              )}
            </span>
          ));
        } else if (search_term.length >= 3) {
          markedup_line = highlight_text(
            markedup_line,
            search_term,
            `line-${i}-${part_index}`,
          );
        } else if (markedup_line.indexOf("fracto-") === 0) {
          markedup_line = (
            <styles.FractoLine>{markedup_line}</styles.FractoLine>
          );
        } else if (markedup_line.indexOf("[") === 0) {
          const end_bracket = markedup_line.indexOf("]");
          if (end_bracket > 0) {
            markedup_line = [
              "[",
              <styles.HighlightSpan key={`highlight-${i}-${part_index}`}>
                {markedup_line.slice(1, end_bracket)}
              </styles.HighlightSpan>,
              markedup_line.slice(end_bracket),
            ];
          }
        }
        return (
          <styles.ConsoleLine
            key={`console-line-${i}-${part_index}`}
            style={line_has_match ? { backgroundColor: "#555555" } : undefined}
          >
            {part_index === 0 && timestamps[i] && (
              <span
                style={{ color: "#aaaaaa" }}
                title={relative_time(timestamps[i])}
              >
                [{timestamps[i]}]{" "}
              </span>
            )}
            {part_index > 0 &&
              timestamps[i] &&
              " ".repeat(`[${timestamps[i]}] `.length)}
            {markedup_line}
          </styles.ConsoleLine>
        );
      });
    const previous_timestamp = i > 0 ? Date.parse(timestamps[i - 1]) : NaN;
    const current_timestamp = Date.parse(timestamps[i]);
    const gap_ms = current_timestamp - previous_timestamp;
    const time_gap =
      gap_ms > LOG_TIME_GAP_MS ? (
        <styles.LogTimeGap key={`log-time-gap-${i}`}>
          {relative_time(timestamps[i])} ({gap_length(gap_ms)})
        </styles.LogTimeGap>
      ) : null;
    return time_gap ? [time_gap, ...rendered_parts] : rendered_parts;
  });
};

export const load_logs_data = async (port, splitter_key) => {
  const data = await LogsBackend.load(port);
  const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS);
  const sidebar_position_px = AppSettings.get(splitter_key);
  return {
    console_lines: data.lines,
    records:
      data.records ||
      data.lines.map((message) => ({ timestamp: null, message })),
    logfile_name: data.logfile_name,
    content_area: {
      width_px: viewport_dimensions.width - sidebar_position_px - 20,
      height_px: viewport_dimensions.height - 100,
    },
  };
};
