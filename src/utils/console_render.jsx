
import {MainStyles as styles} from '../styles/MainStyles.jsx'
import AppSettings from "../AppSettings.jsx";
import {TIME_AGO_LOCALE} from "../constants.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../settings/RootSettings.jsx";

const remove_color_codes = (str) => {
   // Regex to match common ANSI escape codes
   // eslint-disable-next-line no-control-regex
   return str.replace(/\x1b\[[0-9;]*m/g, '');
};

const relative_time = timestamp => {
   const elapsed_ms = Date.parse(timestamp) - Date.now()
   if (Number.isNaN(elapsed_ms)) return timestamp
   const units = [
      ['year', 31536000000],
      ['month', 2592000000],
      ['week', 604800000],
      ['day', 86400000],
      ['hour', 3600000],
      ['minute', 60000],
      ['second', 1000],
   ]
   const [unit, duration] = units.find(([, unit_duration]) =>
      Math.abs(elapsed_ms) >= unit_duration
   ) || units[units.length - 1]
   const value = Math.round(elapsed_ms / duration)
   return new Intl.RelativeTimeFormat(TIME_AGO_LOCALE, {numeric: 'auto'}).format(value, unit)
}

export const render_lines = (console_lines, timestamps = [], styled_segments = []) => {
   return console_lines.flatMap((line, i) => {
      const text_line = typeof line === 'string' ? line : String(line ?? '')
      let formatted_line = text_line
      const json_candidate = remove_color_codes(text_line).trim()
      if ((json_candidate.startsWith('{') && json_candidate.endsWith('}'))
         || (json_candidate.startsWith('[') && json_candidate.endsWith(']'))) {
         try {
            const parsed = JSON.parse(json_candidate)
            if (parsed && typeof parsed === 'object') {
               formatted_line = JSON.stringify(parsed, null, 2)
            }
         } catch {
            // Plain-text log messages are rendered as-is.
         }
      }
      return formatted_line.split(/\r?\n/).map((line_part, part_index) => {
         let markedup_line = remove_color_codes(line_part)
         const segments = formatted_line === line ? styled_segments[i] : null
         if (segments?.length) {
            markedup_line = segments.map((segment, segment_index) => (
               <span
                  key={`segment-${i}-${part_index}-${segment_index}`}
                  style={segment.color ? {color: segment.color} : undefined}
               >{remove_color_codes(segment.text)}</span>
            ))
         } else if (markedup_line.indexOf('fracto-') === 0) {
            markedup_line = <styles.FractoLine>{markedup_line}</styles.FractoLine>
         } else if (markedup_line.indexOf('[') === 0) {
            const end_bracket = markedup_line.indexOf(']')
            if (end_bracket > 0) {
               markedup_line = [
                  '[',
                  <styles.HighlightSpan key={`highlight-${i}-${part_index}`}>
                     {markedup_line.slice(1, end_bracket)}
                  </styles.HighlightSpan>,
                  markedup_line.slice(end_bracket),
               ]
            }
         }
         return <styles.ConsoleLine
            key={`console-line-${i}-${part_index}`}>
            {part_index === 0 && timestamps[i] && <span
               style={{color: '#aaaaaa'}}
               title={relative_time(timestamps[i])}
            >[{timestamps[i]}] </span>}
            {markedup_line}
         </styles.ConsoleLine>
      })
   })
}

export const load_logs_data = async (port, splitter_key ) => {
   const url = `http://localhost:${port}/logs`
   const response = await fetch(url)
   const data = await response.json()
   const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS)
   const sidebar_position_px = AppSettings.get(splitter_key)
   return {
      console_lines: data.lines,
      records: data.records || data.lines.map(message => ({timestamp: null, message})),
      logfile_name: data.logfile_name,
      content_area: {
         width_px: viewport_dimensions.width - sidebar_position_px - 20,
         height_px: viewport_dimensions.height - 100,
      }
   }
}
