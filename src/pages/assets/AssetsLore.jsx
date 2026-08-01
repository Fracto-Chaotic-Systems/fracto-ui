import React, {Component} from "react";

import {MainStyles as styles} from '../../styles/MainStyles.jsx'
import {LoreStyles as lore_styles} from './lore/LoreStyles.jsx'
import AppText from "../../AppText.jsx";
import {KEY_ASSETS_LORE} from "../../text/AssetsText.jsx";
import {KEY_STUDY_SPLITTER_POS_PX} from "../../settings/StudySettings.jsx";
import {update_dimensions} from "../PageUtils.jsx"
import LoreCategoryList from "./lore/LoreCategoryList.jsx";
import {CATEGORY_LIST_WIDTH_PX} from "./lore/LoreStyles.jsx";
import {LoreContentList} from "./lore/LoreContentList.jsx";

const UPDATE_INTERVAL_MS = 1000

export class AssetsLore extends Component {

    state = {
        rendered_width: 0,
        rendered_height: 0,
        interval: null,
        edit_component: [],
        list_component: [],
        content: [],
    }

    componentDidMount() {
        this.update_dimensions()
        this.setState({
            interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
        })
    }

    componentWillUnmount() {
        const {interval, subscription} = this.state
        if (interval) {
            clearInterval(interval)
        }
    }

    update_dimensions = () => {
        const {rendered_width, rendered_height} = this.state;
        const new_values = update_dimensions(rendered_width, rendered_height, KEY_STUDY_SPLITTER_POS_PX)
        if (new_values) {
            this.setState(new_values)
        }
    }

    on_new_item = (edit_component) => {
        this.setState({edit_component})
    }

    on_select_content = (content) => {
        this.setState({content})
    }

    on_select_category = (category) => {
        const {rendered_width, rendered_height} = this.state
        console.log('on_select_category', category)
        const list_component = <lore_styles.ScrollingLoreList>
            <LoreContentList
                width_px={rendered_width - CATEGORY_LIST_WIDTH_PX}
                height_px={rendered_height}
                on_select_content={this.on_select_content}
                category_id={category.id}
            />
            {category.category_name}
        </lore_styles.ScrollingLoreList>
        this.setState({list_component, edit_component: []})
    }

    render() {
        const {
            rendered_width, rendered_height,
            edit_component, list_component
        } = this.state
        return [
            <styles.SectionTitle
                key={'assets-status-title'}>
                {AppText.get(KEY_ASSETS_LORE)}
            </styles.SectionTitle>,
            <styles.BodyWrapper
                key={'input-form'}>
                <LoreCategoryList
                    height_px={rendered_height}
                    width_px={CATEGORY_LIST_WIDTH_PX}
                    on_select_category={this.on_select_category}
                    on_new_item={this.on_new_item}
                    content_width_px={rendered_width - CATEGORY_LIST_WIDTH_PX}
                />
                {edit_component}
                {list_component}
            </styles.BodyWrapper>,
        ];
    }
}

export default AssetsLore
