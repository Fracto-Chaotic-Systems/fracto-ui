import React, { Component } from "react";
import styled from "styled-components";

import AppText from "../../../AppText.jsx";
import {
  KEY_STUDY_POINTS_FREE_TAB,
  KEY_INLINE_TITLE,
  KEY_NODES_TITLE,
} from "../../../text/StudyText.jsx";
import {
  BAILIWICK_TYPE_FREEFORM,
  BAILIWICK_TYPE_INLINE,
  BAILIWICK_TYPE_NODES,
} from "../../Study.jsx";
import CoolTabs from "../../../utils/ui/CoolTabs.jsx";
import MinibrotList from "../minibrots/MinibrotList.jsx";

const TabsLayout = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
`;

const ListViewport = styled.div`
  height: 100%;
  overflow: auto;
`;

/** Only the active list is mounted; its key reloads data for each bailiwick type. */
export default class PointsMinibrotTabs extends Component {
  viewport_ref = React.createRef();
  state = { selected_tab: 0, list_height: 0, selected_minibrot: null };
  tab_generation = 0;

  componentDidMount() {
    this.is_mounted = true;
    this.resize_observer = new ResizeObserver(this.update_dimensions);
    this.resize_observer.observe(this.viewport_ref.current);
    this.update_dimensions();
  }

  componentWillUnmount() {
    this.is_mounted = false;
    this.tab_generation++;
    this.resize_observer.disconnect();
  }

  update_dimensions = () => {
    const list_height = this.viewport_ref.current.clientHeight;
    if (list_height !== this.state.list_height) {
      this.setState({ list_height });
    }
  };

  on_tab_select = (selected_tab) => {
    this.tab_generation++;
    this.setState({ selected_tab, selected_minibrot: null });
    this.props?.on_select_minibrot?.(null);
  };

  on_select_minibrot = (selected_minibrot) => {
    this.setState({ selected_minibrot });
    this.props?.on_select_minibrot?.(selected_minibrot || null);
  };

  render_list = (bailiwick_type) => {
    const generation = this.tab_generation;
    return (
      <MinibrotList
        key={bailiwick_type}
        bailiwick_type={bailiwick_type}
        height_px={this.state.list_height}
        on_select_minibrot={(selected) => {
          if (this.is_mounted && generation === this.tab_generation)
            this.on_select_minibrot(selected);
        }}
        ready={true}
        selectable_list={true}
      />
    );
  };

  render_tab_content = () => {
    switch (this.state.selected_tab) {
      case 0:
        return this.render_list(BAILIWICK_TYPE_FREEFORM);
      case 1:
        return this.render_list(BAILIWICK_TYPE_INLINE);
      case 2:
        return this.render_list(BAILIWICK_TYPE_NODES);
      default:
        console.error(
          "Unknown orbital points list tab",
          this.state.selected_tab,
        );
        return null;
    }
  };

  render() {
    return (
      <TabsLayout>
        <CoolTabs
          labels={[
            AppText.get(KEY_STUDY_POINTS_FREE_TAB),
            AppText.get(KEY_INLINE_TITLE),
            AppText.get(KEY_NODES_TITLE),
          ]}
          tab_index={this.state.selected_tab}
          on_tab_select={this.on_tab_select}
          fill_height={true}
          selected_content={
            <ListViewport ref={this.viewport_ref}>
              {this.render_tab_content()}
            </ListViewport>
          }
        />
      </TabsLayout>
    );
  }
}
