import React, { Component } from "react";
import PropTypes from "prop-types";

import { copy_json } from "../utils/Dom.jsx";

import { NavigatorStyles as styles } from "../styles/NavigatorStyles.jsx";
import AppSettings from "../AppSettings.jsx";

import FractoRasterImage from "../utils/render/FractoRasterImage.jsx";

export class NavigatorSteps extends Component {
  static propTypes = {
    bounding_rect: PropTypes.object.isRequired,
    frame_settings: PropTypes.object.isRequired,
    frame_settings_key: PropTypes.string.isRequired,
  };
  state = {
    stored_width_px: 1,
    stored_height_px: 1,
    stored_scope: 1,
    stored_focal_point_x: 1,
    stored_focal_point_y: 1,
    step_scopes: [],
  };

  componentDidMount() {
    const { bounding_rect } = this.props;
    this.setState({
      stored_width_px: bounding_rect.width,
      stored_height_px: bounding_rect.height,
    });
    this.set_steps();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const { bounding_rect, frame_settings } = this.props;
    const width_changed = this.state.stored_width_px !== bounding_rect.width;
    const height_changed = this.state.stored_height_px !== bounding_rect.height;
    const scope_changed = this.state.stored_scope !== frame_settings.scope;
    const focal_point_x_changed =
      this.state.stored_focal_point_x !== frame_settings.focal_point.x;
    const focal_point_y_changed =
      this.state.stored_focal_point_y !== frame_settings.focal_point.y;
    if (
      width_changed ||
      height_changed ||
      scope_changed ||
      focal_point_x_changed ||
      focal_point_y_changed
    ) {
      this.setState({
        stored_width_px: bounding_rect.width,
        stored_height_px: bounding_rect.height,
        stored_scope: frame_settings.scope,
        stored_focal_point_x: frame_settings.focal_point.x,
        stored_focal_point_y: frame_settings.focal_point.y,
      });
      this.set_steps();
    }
  }

  set_steps = () => {
    const { bounding_rect, frame_settings } = this.props;
    const steps_count = Math.floor(bounding_rect.height / bounding_rect.width);
    const step_scopes = [];
    for (let step = 0; step < steps_count; step++) {
      const scope =
        3.0 * Math.pow(frame_settings.scope / 3.0, step / steps_count);
      step_scopes.unshift(scope);
    }
    this.setState({ step_scopes });
  };

  render() {
    const { bounding_rect, frame_settings, frame_settings_key } = this.props;
    const { step_scopes } = this.state;
    return step_scopes.map((scope) => {
      return (
        <styles.StepImageWrapper
          onClick={(e) => {
            const frame_settings_copy = copy_json(frame_settings);
            frame_settings_copy.scope = scope;
            AppSettings.on_settings_changed({
              [frame_settings_key]: frame_settings_copy,
            });
          }}
        >
          <FractoRasterImage
            width_px={bounding_rect.width - 2}
            focal_point={frame_settings.focal_point}
            scope={scope}
          />
        </styles.StepImageWrapper>
      );
    });
  }
}

export default NavigatorSteps;
