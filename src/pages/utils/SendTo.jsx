import React, {Component} from "react";
import PropTypes from "prop-types";

import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";
import CoolSelect from "../../utils/ui/CoolSelect.jsx";
import AppSettings from "../../AppSettings.jsx";
import {
   KEY_TILES_GENERATOR_FRAME_SETTINGS,
   KEY_TILES_SECTION,
   TILES_GENERATOR
} from "../../settings/TilesSettings.jsx";
import {
   ASSETS_DETECTOR,
   ASSETS_GENERATOR,
   KEY_ASSETS_DETECTOR_FRAME_SETTINGS,
   KEY_ASSETS_GENERATOR_FRAME_SETTINGS,
   KEY_ASSETS_SECTION
} from "../../settings/AssetsSettings.jsx";
import {copy_json} from "../../utils/Dom.jsx";
import {KEY_STUDY_CIRCUITRY_FRAME_SETTINGS, KEY_STUDY_SECTION, STUDY_CIRCUITRY} from "../../settings/StudySettings.jsx";

const SEND_TO_PROMPT = -1
export const PAGE_TILES_GENERATE = 1
export const PAGE_ASSETS_IMAGE_GENERATE = 2
export const PAGE_ASSETS_DETECTOR = 3
export const PAGE_LORE_IMAGE = 4
export const PAGE_STUDY_CIRCUITRY = 5

export const send_to = (frame_settings, destination) => {
   let routing = null
   console.log('send_to', frame_settings, destination)
   const frame_settings_copy = copy_json(frame_settings)
   delete frame_settings_copy.canvas_buffer
   delete frame_settings_copy.ctx
   delete frame_settings_copy.width_px
   switch (parseInt(destination)) {
      case PAGE_TILES_GENERATE:
         console.log('it is tiles generate', frame_settings_copy);
         AppSettings.on_settings_changed({
            [KEY_TILES_GENERATOR_FRAME_SETTINGS]: frame_settings_copy,
            [KEY_TILES_SECTION]: TILES_GENERATOR,
         })
         routing = '/tiles'
         break;

      case PAGE_ASSETS_IMAGE_GENERATE:
         console.log('it is image generate', frame_settings_copy);
         AppSettings.on_settings_changed({
            [KEY_ASSETS_GENERATOR_FRAME_SETTINGS]: frame_settings_copy,
            [KEY_ASSETS_SECTION]: ASSETS_GENERATOR,
         })
         routing = '/assets'
         break;

      case PAGE_ASSETS_DETECTOR:
         console.log('it is asset detector', frame_settings_copy);
         AppSettings.on_settings_changed({
            [KEY_ASSETS_DETECTOR_FRAME_SETTINGS]: frame_settings_copy,
            [KEY_ASSETS_SECTION]: ASSETS_DETECTOR,
         })
         routing = '/assets'
         break;
      
      case PAGE_STUDY_CIRCUITRY:
         console.log('it is study circuitry', frame_settings_copy);
         AppSettings.on_settings_changed({
            [KEY_STUDY_CIRCUITRY_FRAME_SETTINGS]: frame_settings_copy,
            [KEY_STUDY_SECTION]: STUDY_CIRCUITRY,
         })
         routing = '/assets'
         break;

      default:
         console.log('it is not known', destination);
         return;
   }
   if (routing) {
      setTimeout(() => {
         console.log('window.location', routing)
         window.location.assign(routing)
      }, 1000)
   }
}

const SEND_TO_OPTIONS = [
   {label: 'select', value: -1, help: 'where to go',},
   {label: 'tiles', value: PAGE_TILES_GENERATE, help: 'generate',},
   {label: 'images', value: PAGE_ASSETS_IMAGE_GENERATE, help: 'generate',},
   {label: 'detector', value: PAGE_ASSETS_DETECTOR, help: 'artrifact',},
   {label: 'circuitry', value: PAGE_STUDY_CIRCUITRY, help: 'of orbitals',},
]

export class SendTo extends Component {
   static propTypes = {
      frame_settings: PropTypes.object.isRequired,
   }

   render() {
      const {frame_settings} = this.props
      const select_style = {
         padding: 0,
         border: 0,
      }
      return <CoolStyles.InlineBlock
         style={select_style}>
         <CoolSelect
            extra_style={select_style}
            options={SEND_TO_OPTIONS}
            value={SEND_TO_PROMPT}
            on_change={e => send_to(frame_settings, e.target.value)}
         />
      </CoolStyles.InlineBlock>
   }
}

export const render_send_to = (frame_settings) => {
   return <SendTo frame_settings={frame_settings}/>
}
