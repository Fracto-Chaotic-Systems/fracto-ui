import {Component} from "react";

import {
   MainStyles as styles,
   MARGIN_PX,
} from "../src/styles/MainStyles.jsx";
import {
   CoolTable,
   CELL_ALIGN_RIGHT,
   CELL_TYPE_CALLBACK,
   CELL_TYPE_TEXT_KEY,
   TABLE_NO_BORDER,
   TABLE_NO_HEADER,
} from "../src/utils/ui/CoolTable.jsx";
import {
   KEY_STUDY_ASPECT,
   KEY_STUDY_CARDINALITY,
   KEY_STUDY_PRECISION,
   KEY_STUDY_RANGE_MAX,
   KEY_STUDY_RANGE_MIN,
} from "../src/text/StudyText.jsx";
import PropTypes from "prop-types";
import {
   KEY_STUDY_MAGNITUDES_ASPECT,
   KEY_STUDY_MAGNITUDES_CARDINALITY,
   KEY_STUDY_MAGNITUDES_PRECISION,
   KEY_STUDY_MAGNITUDES_RANGE_MAX,
   KEY_STUDY_MAGNITUDES_RANGE_MIN,
} from "../src/settings/StudySettings.jsx";
import AppSettings from "../src/AppSettings.jsx";
import {CoolInputText} from "../src/utils/ui/CoolImports.jsx";

const DATA_ENTRY_COLUMNS = [
   {
      id: "prompt",
      type: CELL_TYPE_TEXT_KEY,
      width_px: 150,
      align: CELL_ALIGN_RIGHT,
      style: {
         textTransform: 'uppercase',
         backgroundColor: 'white',
         fontSize: '12px',
         fontWeight: 'bold',
         padding: 0,
      }
   },
   {
      id: 'data',
      type: CELL_TYPE_CALLBACK,
      width_px: 250,
   }
]

const DATA_ENTRY_VALUES = [
   {prompt_key: KEY_STUDY_ASPECT, data_key: KEY_STUDY_MAGNITUDES_ASPECT},
   {prompt_key: KEY_STUDY_CARDINALITY, data_key: KEY_STUDY_MAGNITUDES_CARDINALITY},
   {prompt_key: KEY_STUDY_RANGE_MIN, data_key: KEY_STUDY_MAGNITUDES_RANGE_MIN},
   {prompt_key: KEY_STUDY_RANGE_MAX, data_key: KEY_STUDY_MAGNITUDES_RANGE_MAX},
   {prompt_key: KEY_STUDY_PRECISION, data_key: KEY_STUDY_MAGNITUDES_PRECISION},
]

export class FilterDataEntry extends Component {
   static propTypes = {
      height_px: PropTypes.number.isRequired,
      width_px: PropTypes.number.isRequired,
   }

   change_value(data_key, value) {
      AppSettings.on_settings_changed({
         [data_key]: value,
      })
   }

   enter_data = (data_key) => {
      const data_setting = AppSettings.get(data_key)
      return <CoolInputText
         value={data_setting}
         on_change={value => this.change_value(data_key, value)}
      />
   }

   render_data_entry = (height_px, width_px) => {
      if (!height_px) {
         return <styles.InlineContentWrapper/>
      }
      const background_style = {
         width: `${width_px - MARGIN_PX}px`,
         maxHeight: `${height_px - MARGIN_PX}px`,
         marginRight: '0.5rem'
      }
      const data_values = DATA_ENTRY_VALUES.map(value => {
         return {
            prompt: value.prompt_key,
            data: [this.enter_data, value.data_key],
         }
      })
      const button_style = {
         marginRight: '0.5rem',
         marginTop: '0.5rem',
      }
      return <styles.InlineContentWrapper style={background_style}>
         <styles.TableWrapper style={{boxShadow: 'none'}}>
            <CoolTable
               columns={DATA_ENTRY_COLUMNS}
               data={data_values}
               options={[TABLE_NO_HEADER, TABLE_NO_BORDER]}
            />
         </styles.TableWrapper>
      </styles.InlineContentWrapper>
   }

   render() {
      const {height_px, width_px} = this.props
      return this.render_data_entry(height_px, width_px)
   }
}

export default FilterDataEntry
