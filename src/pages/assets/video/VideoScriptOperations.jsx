import React, { Component } from "react";
import PropTypes from "prop-types";

import AppText from "../../../AppText.jsx";
import CoolStyles from "../../../utils/ui/styles/CoolStyles.jsx";
import CoolButton from "../../../utils/ui/CoolButton.jsx";
import CoolInputText from "../../../utils/ui/CoolInputText.jsx";
import VideoControlButtons from "./VideoControlButtons.jsx";
import { BACKGROUND_FIELD_GRADIENT } from "../../../styles/BackgroundStyles.jsx";
import FractoRasterImage from "../../../utils/render/FractoRasterImage.jsx";
import AppSettings from "../../../AppSettings.jsx";
import { KEY_VIDEO_GENERATOR_FRAME_SETTINGS } from "../../../settings/AssetsSettings.jsx";
import {
  KEY_VIDEO_ASSETS_ADD_STEP,
  KEY_VIDEO_ASSETS_CANCEL,
  KEY_VIDEO_ASSETS_CONFIRM,
  KEY_VIDEO_ASSETS_STEP,
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
    on_control_action: PropTypes.func.isRequired,
    can_undo: PropTypes.bool,
    can_redo: PropTypes.bool,
    on_step_select: PropTypes.func,
  };

  state = {
    frame_settings: AppSettings.get(KEY_VIDEO_GENERATOR_FRAME_SETTINGS),
    frame_settings_subscription: null,
    editing_title: false,
    title_draft: this.props.selected_video?.title || "",
    selected_step_index: 0,
    scrollbar_height_px: 0,
  };

  static defaultProps = {
    can_undo: false,
    can_redo: false,
  };

  steps_scroll_ref = React.createRef();
  step_refs = new Map();
  pending_step_index = null;

  componentDidMount() {
    this.setState({
      frame_settings_subscription: AppSettings.subscribe(
        KEY_VIDEO_GENERATOR_FRAME_SETTINGS,
        this.on_frame_settings_changed,
      ),
    });
    this.initialize_first_step();
    // On the first page load this component mounts after the persisted video
    // is restored, so there is no prop update to trigger componentDidUpdate.
    // Treat the initial card exactly like a user-selected step.
    const initial_steps = this.get_script_steps();
    if (initial_steps.length) {
      this.select_step(0, initial_steps[0]);
    }
    this.measure_steps_scrollbar();
  }

  componentWillUnmount() {
    const { frame_settings_subscription } = this.state;
    if (frame_settings_subscription) {
      AppSettings.unsubscribe(frame_settings_subscription);
    }
  }

  componentDidUpdate(prevProps) {
    this.measure_steps_scrollbar();
    if (prevProps.selected_video !== this.props.selected_video) {
      this.initialize_first_step();
      // Opening a video is equivalent to selecting its first step. Apply the
      // step's frame settings so Navigator follows the initial card too.
      const current_steps = this.get_script_steps();
      if (current_steps.length) {
        const selected_step_index = Math.min(
          this.pending_step_index ?? 0,
          current_steps.length - 1,
        );
        this.pending_step_index = null;
        this.select_step(
          selected_step_index,
          current_steps[selected_step_index],
        );
      } else {
        this.pending_step_index = null;
        this.setState({ selected_step_index: 0 });
        this.props.on_step_select?.(0);
      }
      const previous_step_count = this.get_script_for_video(
        prevProps.selected_video,
      ).steps?.length || 0;
      const current_step_count = this.get_script_steps().length;
      if (current_step_count > previous_step_count) {
        requestAnimationFrame(() => {
          const scroll_element = this.steps_scroll_ref.current;
          if (scroll_element) {
            scroll_element.scrollLeft =
              scroll_element.scrollWidth - scroll_element.clientWidth;
          }
        });
      }
      if (!this.state.editing_title) {
        const next_title = this.props.selected_video?.title || "";
        if (next_title !== this.state.title_draft) {
          this.setState({ title_draft: next_title });
        }
      }
    }
  }

  measure_steps_scrollbar = () => {
    requestAnimationFrame(() => {
      const scroll_element = this.steps_scroll_ref.current;
      if (!scroll_element) return;
      const scrollbar_height_px = Math.max(
        0,
        scroll_element.offsetHeight - scroll_element.clientHeight,
      );
      if (scrollbar_height_px !== this.state.scrollbar_height_px) {
        this.setState({ scrollbar_height_px });
      }
    });
  };

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

  get_script_for_video = (selected_video) => {
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

  get_script = () =>
    this.get_script_for_video(this.props.selected_video);

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
    this.pending_step_index = steps.length;
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

  select_step = (step_index, step) => {
    this.setState({ selected_step_index: step_index }, () => {
      this.props.on_step_select?.(step_index);
      this.scroll_step_into_view(step_index);
    });
    const current_frame_settings = this.get_current_frame_settings() || {};
    AppSettings.on_settings_changed({
      [KEY_VIDEO_GENERATOR_FRAME_SETTINGS]: {
        ...current_frame_settings,
        focal_point: { ...step.focal_point },
        scope: step.scope,
      },
    });
  };

  scroll_step_into_view = (step_index) => {
    requestAnimationFrame(() => {
      const scroll_element = this.steps_scroll_ref.current;
      const step_element = this.step_refs.get(step_index);
      if (!scroll_element || !step_element) return;
      const visible_left = scroll_element.scrollLeft;
      const visible_right = visible_left + scroll_element.clientWidth;
      const step_left = step_element.offsetLeft;
      const step_right = step_left + step_element.offsetWidth;
      let next_scroll_left = visible_left;
      if (step_left < visible_left) {
        next_scroll_left = step_left;
      } else if (step_right > visible_right) {
        next_scroll_left = step_right - scroll_element.clientWidth;
      }
      if (next_scroll_left !== visible_left) {
        scroll_element.scrollTo({
          left: Math.max(0, next_scroll_left),
          behavior: "smooth",
        });
      }
    });
  };

  render_step = (step, step_index, content_height_px) => {
    const is_selected = step_index === this.state.selected_step_index;
    return (
      <CoolStyles.Block
        key={`video-script-step-${step_index}`}
        ref={(element) => {
          if (element) {
            this.step_refs.set(step_index, element);
          } else {
            this.step_refs.delete(step_index);
          }
        }}
        onClick={() => this.select_step(step_index, step)}
        style={{
          boxSizing: "border-box",
          flex: "0 0 120px",
          width: "120px",
          height: `${Math.max(0, content_height_px - 6)}px`,
          border: is_selected ? "3px solid #555555" : "1.5px solid #888888",
          borderRadius: "10px",
          backgroundColor: is_selected ? "white" : "#eeeeee",
          boxShadow: "0.25rem 0.25rem 0.5rem rgba(0, 0, 0, 0.2)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "0.5rem",
          margin: "3px 0 3px 3px",
          marginRight: "0.25rem",
          cursor: "pointer",
        }}
      >
        <FractoRasterImage
          width_px={120}
          focal_point={step.focal_point}
          scope={step.scope}
          aspect_ratio={1.0}
        />
        <CoolStyles.InlineBlock
          style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
          }}
        >
          {`${AppText.get(KEY_VIDEO_ASSETS_STEP)} ${step_index + 1}`}
        </CoolStyles.InlineBlock>
      </CoolStyles.Block>
    );
  };

  render_steps = () => {
    const { width_px, height_px } = this.props;
    const steps = this.get_script_steps();
    const content_height_px = Math.max(
      0,
      height_px - SCRIPT_HEADER_HEIGHT_PX,
    );
    const card_area_height_px = Math.max(
      0,
      content_height_px - this.state.scrollbar_height_px,
    );
    return (
      <CoolStyles.Block
        ref={this.steps_scroll_ref}
        style={{
          width: `${width_px}px`,
          height: `${content_height_px}px`,
          overflowX: "auto",
          overflowY: "hidden",
          background: BACKGROUND_FIELD_GRADIENT,
        }}
      >
        <CoolStyles.Block
          style={{
            display: "flex",
            width: "max-content",
            minWidth: "100%",
            height: `${card_area_height_px}px`,
          }}
        >
          {steps.map((step, step_index) =>
            this.render_step(step, step_index, card_area_height_px),
          )}
        </CoolStyles.Block>
      </CoolStyles.Block>
    );
  };

  render() {
    const {
      width_px,
      height_px,
      selected_video,
      on_control_action,
      can_undo,
      can_redo,
    } = this.props;
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
            padding: "0 0.25rem",
            borderBottom: "1px solid #666666",
          }}
        >
          <CoolButton
            content={AppText.get(KEY_VIDEO_ASSETS_ADD_STEP)}
            on_click={this.add_step}
            primary
            disabled={!can_add_step}
          />
          <CoolStyles.InlineBlock
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            {title}
            <VideoControlButtons
              can_undo={can_undo}
              can_redo={can_redo}
              on_control_action={on_control_action}
            />
          </CoolStyles.InlineBlock>
        </CoolStyles.Block>
        {this.render_steps()}
      </CoolStyles.Block>
    );
  }
}

export default VideoScriptOperations;
