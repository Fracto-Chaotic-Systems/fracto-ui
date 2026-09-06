import React, { Component } from "react";
import PropTypes from "prop-types";

import { MainStyles as styles } from "../styles/MainStyles.jsx";
import AppSettings from "../AppSettings.jsx";
import { KEY_VIEWPORT_DIMENSIONS } from "../settings/RootSettings.jsx";

import NavigatorSplitterLayout from "./NavigatorSplitterLayout.jsx";

const UPDATE_INTERVAL_MS = 1000;

export class NavigatorPageLayout extends Component {
  static propTypes = {
    splitter_keys: PropTypes.object.isRequired,
    page_content: PropTypes.array.isRequired,
    on_resize: PropTypes.func.isRequired,
  };

  state = {
    rendered_width: 0,
    rendered_height: 0,
    interval: null,
    container_ref: React.createRef(),
  };

  componentDidMount() {
    this.setState({
      interval: setInterval(this.update_dimensions, UPDATE_INTERVAL_MS),
    });
  }

  componentWillUnmount() {
    const { interval } = this.state;
    if (interval) {
      clearInterval(interval);
    }
  }

  update_dimensions = () => {
    const { rendered_width, rendered_height } = this.state;
    const { splitter_keys, on_resize } = this.props;
    const viewport_dimensions = AppSettings.get(KEY_VIEWPORT_DIMENSIONS);
    const splitter_width = AppSettings.get(splitter_keys.section_key);
    const rendered_width_changed =
      rendered_width !== viewport_dimensions.width - splitter_width;
    const rendered_height_changed =
      rendered_height !== viewport_dimensions.height;
    if (rendered_height_changed || rendered_width_changed) {
      this.setState({
        rendered_width: viewport_dimensions.width - splitter_width,
        rendered_height: viewport_dimensions.height,
      });
    }
    if (on_resize) {
      on_resize(rendered_width, rendered_height);
    }
  };

  render() {
    const { container_ref, rendered_height, rendered_width, frame_settings } =
      this.state;
    const { splitter_keys, page_content } = this.props;
    let top = 0;
    let left = 0;
    if (container_ref.current) {
      const container_bounds = container_ref.current.getBoundingClientRect();
      top = container_bounds.top;
      left = container_bounds.left;
    }
    const bounding_rect = {
      top,
      left,
      width: rendered_width,
      height: rendered_height,
    };
    return [
      <styles.TightCenteredBlock ref={container_ref} key={"generator-content"}>
        <NavigatorSplitterLayout
          bounding_rect={bounding_rect}
          frame_settings={frame_settings}
          frame_settings_key={splitter_keys.frame_settings_key}
          splitter_keys={splitter_keys}
        />
        {page_content}
      </styles.TightCenteredBlock>,
    ];
  }
}

export default NavigatorPageLayout;
