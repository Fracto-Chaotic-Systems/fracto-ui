import React, {Component} from "react";
import PropTypes from "prop-types";

import CoolTable from "../../../utils/ui/CoolTable.jsx";
import {
    render_magnitude,
    render_pattern_block,
} from "../StudyUtils.jsx";

import {
    CELL_ALIGN_CENTER,
    CELL_TYPE_CALLBACK,
    TABLE_CAN_SELECT,
    TABLE_NO_BORDER
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import AppSettings from "../../../AppSettings.jsx";
import {KEY_STUDY_MINIBROTS_SELECTED_ROW} from "../../../settings/StudySettings.jsx";
import {
    KEY_STUDY_CARDINAL,
    KEY_STUDY_MAGNITUDE
} from "../../../text/StudyText.jsx";
import DataBackend from "../../../backend/DataBackend.jsx";
import {
    BAILIWICK_TYPE_FREEFORM,
    BAILIWICK_TYPE_INLINE,
    BAILIWICK_TYPE_NODES
} from "../../Study.jsx";

const CARDINAL_WIDTH_PX = 50
const MAGNITUDE_WIDTH_PX = 120
export const TABLE_WIDTH_PX =
    CARDINAL_WIDTH_PX
    + MAGNITUDE_WIDTH_PX
    + 70;

const TABLE_COLUMNS = [
    {
        id: "cardinality",
        label_key: KEY_STUDY_CARDINAL,
        width_px: CARDINAL_WIDTH_PX,
        type: CELL_TYPE_CALLBACK,
        align: CELL_ALIGN_CENTER,
    },
    {
        id: "magnitude",
        label_key: KEY_STUDY_MAGNITUDE,
        width_px: MAGNITUDE_WIDTH_PX,
        type: CELL_TYPE_CALLBACK,
        align: CELL_ALIGN_CENTER,
    },
]

export class MinibrotList extends Component {
    static propTypes = {
        bailiwick_type: PropTypes.string.isRequired,
        height_px: PropTypes.number.isRequired,
        on_select_minibrot: PropTypes.func.isRequired,
        ready: PropTypes.bool.isRequired,
    }

    state = {
        minibrot_list: [],
        selected_row: -1,
    }

    componentDidMount() {
        this.load_minibrots()
    }

    load_minibrots = async () => {
        const {on_select_minibrot, bailiwick_type} = this.props
        const params = {is_node: 0, is_inline: 0}
        switch (bailiwick_type) {
            case BAILIWICK_TYPE_FREEFORM:
                break;
            case BAILIWICK_TYPE_INLINE:
                params.is_inline = 1
                break
            case BAILIWICK_TYPE_NODES:
                params.is_node = 1
                break
            default:
                console.log("Unknown bailiwick type")
                break;
        }
        DataBackend.get_minibrots(params, minibrot_list => {
            const selected_row = AppSettings.get(KEY_STUDY_MINIBROTS_SELECTED_ROW)
            if (selected_row < minibrot_list.length) {
                const selected_minibrot = minibrot_list[selected_row]
                on_select_minibrot(selected_minibrot)
                this.setState({selected_row})
            }
            console.log('minibrot_list', minibrot_list)
            this.setState({minibrot_list})
        })
    }

    on_select_row = (row) => {
        const {minibrot_list} = this.state
        const {on_select_minibrot} = this.props
        const selected_minibrot = minibrot_list[row]
        this.setState({selected_row: row})
        AppSettings.on_settings_changed({
            [KEY_STUDY_MINIBROTS_SELECTED_ROW]: row
        })
        on_select_minibrot(selected_minibrot)
    }

    render() {
        const {minibrot_list, selected_row} = this.state
        const {height_px, ready} = this.props
        const table_data = minibrot_list.map((row, index) => {
            return {
                cardinality: [render_pattern_block, row.pattern],
                magnitude: [render_magnitude, row.magnitude],
            }
        })
        const table_style = {
            height: `${height_px}px`,
            maxWidth: `${TABLE_WIDTH_PX}px`,
            cursor: ready ? 'pointer' : 'wait',
        }
        const table = <CoolTable
            columns={TABLE_COLUMNS}
            data={table_data}
            options={[TABLE_CAN_SELECT, TABLE_NO_BORDER]}
            selected_row={selected_row}
            on_select_row={this.on_select_row}
        />
        return <div style={table_style}>
            {table}
        </div>
    }
}

export default MinibrotList
