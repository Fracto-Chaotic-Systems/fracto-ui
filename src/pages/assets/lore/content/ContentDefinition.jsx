import React, {Component} from "react";
import PropTypes from "prop-types";

import {AssetsBackend} from "../../../../backend/AssetsBackend.jsx";
import CoolTable from "../../../../utils/ui/CoolTable.jsx";
import {
    TABLE_NO_BORDER,
    TABLE_NO_HEADER
} from "../../../../utils/ui/styles/CoolTableStyles.jsx";

import {
    empty_content,
    render_entry_text,
    TABLE_EDITOR_COLUMNS,
} from "./ContentUtils.jsx";
import {LoreStyles as styles} from '../LoreStyles.jsx'
import {render_meta} from "../LoreMetaData.jsx";
import {render_preamble} from "../LorePreamble.jsx";
import {copy_json} from "../../../../utils/Dom.jsx";

export class ContentDefinition extends Component {
    static propTypes = {
        item_id: PropTypes.number.isRequired,
        category: PropTypes.object.isRequired,
        width_px: PropTypes.number.isRequired,
        height_px: PropTypes.number.isRequired,
    }

    state = {
        content: null,
    }

    componentDidMount() {
        this.load_content()
    }

    load_content = async () => {
        const {item_id, category} = this.props
        const content = item_id > 0
            ? await AssetsBackend.get_lore_content(item_id)
            : empty_content(category)
        this.setState({content})
    }

    update_item_data = (content_data) => {
        const {content} = this.state
        const {content_meta} = content
        content_meta.can_store = true;
        content_meta.modified = content_data.modified;
        content.content_data = copy_json(content_data)
        this.setState({content})
    }

    update_meta_data = (content_meta) => {
        const {content} = this.state
        content.content_meta = copy_json(content_meta)
        this.setState({content})
    }

    on_entry_data_change = (entry) => {
        const {content} = this.state
        const {content_data} = content
        content_data.entry = entry
        this.update_item_data(content_data)
    }

    render_references = (item_data) => {
        return 'references'
    }

    render_content = () => {
        const {content} = this.state
        if (!content) {
            return []
        }
        const {content_data} = content
        const table_data = [
            {
                edit_key: 'entry',
                edit_value: [render_entry_text, {
                    item_data: content_data,
                    on_entry_data_change: this.on_entry_data_change,
                }]
            },
            {
                edit_key: 'refs',
                edit_value: [this.render_references, {
                    item_data: content_data,
                }]
            },
        ]
        return <CoolTable
            columns={TABLE_EDITOR_COLUMNS}
            data={table_data}
            options={[TABLE_NO_HEADER, TABLE_NO_BORDER]}
        />
    }

    render() {
        const {content} = this.state
        const {category} = this.props
        if (!content) {
            console.log('content null', content)
            return []
        }
        const {content_data, content_meta} = content
        if (!content_data) {
            console.log('content_data null', content)
            return []
        }
        const preamble_section = render_preamble(
            content, category, this.update_item_data)
        const content_section = this.render_content()
        const meta_section = render_meta(
            content_meta, content_data, category, this.update_meta_data)
        return <styles.ScrollingLoreList>
            {preamble_section}
            {content_section}
            {meta_section}
        </styles.ScrollingLoreList>
    }
}

export default ContentDefinition
