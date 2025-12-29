
import {MainStyles as styles} from '../styles/MainStyles.jsx'
import AppSettings from "../AppSettings.jsx";
import {KEY_VIEWPORT_DIMENSIONS} from "../settings/RootSettings.jsx";

const remove_color_codes = (str) => {
   // Regex to match common ANSI escape codes
   return str.replace(/\x1b\[[0-9;]*m/g, '');
};

export const render_lines = (console_lines) => {
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
      logfile_name: data.logfile_name,
      content_area: {
         width_px: viewport_dimensions.width - sidebar_position_px - 20,
         height_px: viewport_dimensions.height - 100,
      }
   }
}