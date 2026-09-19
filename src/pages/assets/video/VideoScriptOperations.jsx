import React, { Component } from "react";
import PropTypes from "prop-types";

import AppText from "../../../AppText.jsx";
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import CoolButton from "../../../utils/ui/CoolButton.jsx";
import CoolInputText from "../../../utils/ui/CoolInputText.jsx";
import AppSettings from "../../../AppSettings.jsx";
import { KEY_VIDEO_GENERATOR_FRAME_SETTINGS } from "../../../settings/AssetsSettings.jsx";
import {
  KEY_VIDEO_ASSETS_ADD_STEP,
  KEY_VIDEO_ASSETS_CANCEL,
  KEY_VIDEO_ASSETS_CONFIRM,
} from "../../../text/AssetsText.jsx";

const SCRIPT_HEADER_HEIGHT_PX = 35;

/**
 * Operations for editing the video's frame script.
 *
 * The parent owns the splitter geometry and supplies this block with its
 * exact available dimensions so the script editor can remain block-oriented.
 */
export class VideoScriptOperations extends Component {
  static propTypes = {
    width_px: PropTypes.number.isRequired,
    height_px: PropTypes.number.isRequired,
    selected_video: PropTypes.object.isRequired,
    on_video_change: PropTypes.func.isRequired,
  };

  state = {
    frame_settings: AppSettings.get(KEY_VIDEO_GENERATOR_FRAME_SETTINGS),
    frame_settings_subscription: null,
    editing_title: false,
    title_draft: this.props.selected_video?.title || "",
  };

  componentDidMount() {
    this.setState({
      frame_settings_subscription: AppSettings.subscribe(
        KEY_VIDEO_GENERATOR_FRAME_SETTINGS,
        this.on_frame_settings_changed,
      ),
    });
    this.initialize_first_step();
  }

  componentWillUnmount() {
    const { frame_settings_subscription } = this.state;
    if (frame_settings_subscription) {
      AppSettings.unsubscribe(frame_settings_subscription);
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.selected_video !== this.props.selected_video) {
      this.initialize_first_step();
      if (!this.state.editing_title) {
        const next_title = this.props.selected_video?.title || "";
        if (next_title !== this.state.title_draft) {
          this.setState({ title_draft: next_title });
        }
      }
    }
  }

  begin_title_edit = () => {
    this.setState({
      editing_title: true,
      title_draft: this.props.selected_video?.title || "",
    });
  };

  on_title_change = (title_draft) => {
    this.setState({ title_draft });
  };

  confirm_title_edit = (title) => {
    const trimmed_title = title.trim();
    const current_title = this.props.selected_video?.title || "";
    this.setState({
      editing_title: false,
      title_draft: trimmed_title || current_title,
    });
    if (trimmed_title && trimmed_title !== current_title) {
      this.props.on_video_change({ title: trimmed_title });
    }
  };

  cancel_title_edit = () => {
    this.setState({
      editing_title: false,
      title_draft: this.props.selected_video?.title || "",
    });
  };

  on_frame_settings_changed = (key, frame_settings) => {
    this.setState({ frame_settings });
  };

  get_script = () => {
    const { selected_video } = this.props;
    let script = selected_video?.script;
    if (typeof script === "string") {
      try {
        script = JSON.parse(script);
      } catch (error) {
        script = {};
      }
    }
    return script && typeof script === "object" ? script : {};
  };

  get_script_steps = () => {
    const script = this.get_script();
    return Array.isArray(script.steps) ? script.steps : [];
  };

  get_current_frame_settings = () => {
    return (
      this.state.frame_settings ||
      AppSettings.get(KEY_VIDEO_GENERATOR_FRAME_SETTINGS)
    );
  };

  can_add_step = () => {
    const steps = this.get_script_steps();
    const last_step = steps[steps.length - 1];
    const frame_settings = this.get_current_frame_settings();
    if (!last_step || !frame_settings?.focal_point) {
      return false;
    }
    return (
      last_step.scope !== frame_settings.scope ||
      last_step.focal_point?.x !== frame_settings.focal_point.x ||
      last_step.focal_point?.y !== frame_settings.focal_point.y
    );
  };

  add_step = () => {
    if (!this.can_add_step()) {
      return;
    }
    const { selected_video, on_video_change } = this.props;
    const frame_settings = this.get_current_frame_settings();
    const steps = this.get_script_steps();
    on_video_change({
      script: {
        ...this.get_script(),
        steps: [
          ...steps,
          {
            focal_point: { ...frame_settings.focal_point },
            scope: frame_settings.scope,
          },
        ],
      },
    });
  };

  initialize_first_step = () => {
    const { selected_video, on_video_change } = this.props;
    if (!selected_video || !on_video_change) {
      return;
    }
    const existing_steps = this.get_script_steps();
    if (Array.isArray(existing_steps) && existing_steps.length) {
      return;
    }
    const frame_settings = AppSettings.get(KEY_VIDEO_GENERATOR_FRAME_SETTINGS);
    if (!frame_settings?.focal_point || frame_settings.scope === undefined) {
      return;
    }
    on_video_change({
      script: {
        ...this.get_script(),
        steps: [
          {
            focal_point: frame_settings.focal_point,
            scope: frame_settings.scope,
          },
        ],
      },
    });
  };

  render() {
    const { width_px, height_px, selected_video } = this.props;
    const { editing_title, title_draft } = this.state;
    const can_add_step = this.can_add_step();
    const title = editing_title ? (
      <CoolInputText
        value={title_draft}
        on_change={this.on_title_change}
        actions={{
          on_confirm: this.confirm_title_edit,
          on_cancel: this.cancel_title_edit,
          confirm_title: AppText.get(KEY_VIDEO_ASSETS_CONFIRM),
          cancel_title: AppText.get(KEY_VIDEO_ASSETS_CANCEL),
        }}
        style_extra={{ width: "12rem" }}
      />
    ) : (
      <CoolStyles.InlineBlock
        onClick={this.begin_title_edit}
          style={{
            cursor: "pointer",
            fontSize: "1.125rem",
            fontWeight: "bold",
            fontStyle: "italic",
          }}
      >
        {selected_video.title || ""}
      </CoolStyles.InlineBlock>
    );
    return (
      <CoolStyles.Block
        style={{
          width: `${width_px}px`,
          height: `${height_px}px`,
        }}
      >
        <CoolStyles.Block
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxSizing: "border-box",
            width: `${width_px}px`,
            height: `${SCRIPT_HEADER_HEIGHT_PX}px`,
            padding: "0 0.5rem",
            borderBottom: "1px solid #666666",
          }}
        >
          <CoolButton
            content={AppText.get(KEY_VIDEO_ASSETS_ADD_STEP)}
            on_click={this.add_step}
            primary
            disabled={!can_add_step}
          />
          {title}
        </CoolStyles.Block>
      </CoolStyles.Block>
    );
  }
}

export default VideoScriptOperations;
