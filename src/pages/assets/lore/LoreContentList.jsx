import React, {Component} from "react";
import PropTypes from "prop-types";

import DataBackend from "../../../backend/DataBackend.jsx";
import {LoreStyles as styles} from './LoreStyles.jsx'
import {
    CELL_ALIGN_CENTER,
    CELL_ALIGN_LEFT,
    CELL_TYPE_TEXT,
    CELL_TYPE_TEXT_KEY,
    CELL_TYPE_TIME_AGO
} from "../../../utils/ui/styles/CoolTableStyles.jsx";
import {
    KEY_LORE_CONTENT_DRAFT,
    KEY_LORE_CONTENT_MODIFIED,
    KEY_LORE_CONTENT_PUBLISHED,
    KEY_LORE_CONTENT_STATUS,
    KEY_LORE_CONTENT_TITLE
} from "../../../text/AssetsText.jsx";
import CoolTable from "../../../utils/ui/CoolTable.jsx";

const TABLE_COLUMNS = [
    {
        id: "title",
        label_key: KEY_LORE_CONTENT_TITLE,
        width_px: 150,
        type: CELL_TYPE_TEXT,
        align: CELL_ALIGN_LEFT,
    },
    {
        id: "modified",
        label_key: KEY_LORE_CONTENT_MODIFIED,
        width_px: 100,
        type: CELL_TYPE_TIME_AGO,
        align: CELL_ALIGN_LEFT,
    },
    {
        id: "status",
        label_key: KEY_LORE_CONTENT_STATUS,
        width_px: 80,
        type: CELL_TYPE_TEXT_KEY,
        align: CELL_ALIGN_CENTER,
    },
]

export class LoreContentList extends Component {
    static propTypes = {
        category_id: PropTypes.number.isRequired,
        width_px: PropTypes.number.isRequired,
        height_px: PropTypes.number.isRequired,
        on_select_content: PropTypes.func.isRequired,
    }

    state = {
        order_by: -1,
        content_list: [],
    }

    componentDidMount() {
        this.load_content()
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.category_id !== this.props.category_id) {
            this.load_content()
        }
    }

    load_content = () => {
        const {category_id} = this.props
        DataBackend.lore_content_listing(category_id, response => {
            console.log('load_content', category_id, response)
            this.setState({content_list: response.result})
        })
    }

    render_content_list = () => {
        const {content_list} = this.state
        const table_data = content_list.map((item) => {
            return {
                title: item.title,
                modified: item.content_meta.modified,
                status: item.content_meta.published
                    ? KEY_LORE_CONTENT_PUBLISHED
                    : KEY_LORE_CONTENT_DRAFT,
            }
        })
        return <CoolTable
            data={table_data}
            columns={TABLE_COLUMNS}
        />
    }

    render() {
        const content_list = this.render_content_list()
        return <styles.ScrollingLoreList>
            {content_list}
        </styles.ScrollingLoreList>
    }
}
