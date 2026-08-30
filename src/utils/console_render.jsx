
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

export const render_lines = (console_lines, timestamps = []) => {
   return console_lines.map((line, i) => {
      let markedup_line = remove_color_codes(line)
      if (markedup_line.indexOf('fracto-') === 0) {
         markedup_line = <styles.FractoLine>{markedup_line}</styles.FractoLine>
      } else if (markedup_line.indexOf('[') === 0) {
         const end_bracket = markedup_line.indexOf(']')
         if (end_bracket > 0) {
            markedup_line = [
               '[',
               <styles.HighlightSpan>
                  {markedup_line.slice(1, end_bracket)}
               </styles.HighlightSpan>,
               markedup_line.slice(end_bracket),
            ]
         }
      }
      return <styles.ConsoleLine
         key={`console-line-${i}`}>
         {timestamps[i] && <span
            style={{color: '#aaaaaa'}}
            title={relative_time(timestamps[i])}
         >[{timestamps[i]}] </span>}
         {markedup_line}
      </styles.ConsoleLine>
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
