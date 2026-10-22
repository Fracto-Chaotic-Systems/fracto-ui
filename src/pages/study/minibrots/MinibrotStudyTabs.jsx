import { Component } from "react";
import PropTypes from "prop-types";
import AppText from "../../../AppText.jsx";
import {
  KEY_STUDY_MINIBROT_ORBITAL_TAB,
  KEY_STUDY_MINIBROT_RAY_PATHS_TAB,
  KEY_STUDY_MINIBROT_SEEDS_TAB,
} from "../../../text/StudyText.jsx";
import CoolTabs from "../../../utils/ui/CoolTabs.jsx";
import CircuitryChart from "../circuitry/CircuitryChart.jsx";
import MinibrotContextCanvas from "./MinibrotContextCanvas.jsx";
import SeedSurveyDetect from "../../assets/surveys/SeedSurveyDetect.jsx";

/** Owns the freeform record's analysis tabs; only the active view is mounted. */
export default class MinibrotStudyTabs extends Component {
  static propTypes = {
    selected_minibrot: PropTypes.object.isRequired,
    width_px: PropTypes.number.isRequired,
  };
  state = { selected_tab: 0 };
  on_tab_select = (selected_tab) => this.setState({ selected_tab });
  render_tab_content = () => {
    const { selected_minibrot, width_px } = this.props;
    const content_width = Math.max(500, (Number(width_px) || 500) - 24);
    const core_point = JSON.parse(selected_minibrot.core_point);
    const display_settings = JSON.parse(selected_minibrot.display_settings);
    if (!Number.isFinite(core_point?.x) || !Number.isFinite(core_point?.y))
      return null;
    switch (this.state.selected_tab) {
      case 0:
        return (
          <CircuitryChart
            key={`orbital:${selected_minibrot.id}:${selected_minibrot.core_point}:${selected_minibrot.pattern}`}
            focal_point={core_point}
            scope={Number(display_settings.scope)}
            width_px={content_width}
            height_px={600}
          />
        );
      case 1: {
        const { focal_point } = display_settings;
        const scope = Number(display_settings.scope) * 3;
        if (
          !Number.isFinite(scope) ||
          scope <= 0 ||
          !Number.isFinite(focal_point?.x) ||
          !Number.isFinite(focal_point?.y)
        )
          return null;
        return (
          <MinibrotContextCanvas
            key={`${selected_minibrot.id}:${selected_minibrot.core_point}:${selected_minibrot.pattern}:${focal_point.x}:${focal_point.y}:${scope}`}
            minibrot_id={selected_minibrot.id}
            core_point={core_point}
            period={Number(selected_minibrot.pattern)}
            focal_point={focal_point}
            scope={scope}
          />
        );
      }
      case 2:
        return (
          <SeedSurveyDetect
            key={`seeds:${selected_minibrot.id}:${selected_minibrot.core_point}`}
            focal_point={core_point}
            width_px={content_width}
            height_px={600}
          />
        );
      default:
        console.error("Unknown minibrot study tab", this.state.selected_tab);
        return null;
    }
  };
  render() {
    return (
      <div style={{ marginTop: "0.5rem" }}>
        <CoolTabs
          labels={[
            AppText.get(KEY_STUDY_MINIBROT_ORBITAL_TAB),
            AppText.get(KEY_STUDY_MINIBROT_RAY_PATHS_TAB),
            AppText.get(KEY_STUDY_MINIBROT_SEEDS_TAB),
          ]}
          tab_index={this.state.selected_tab}
          on_tab_select={this.on_tab_select}
          selected_content={
            <div style={{ padding: "0.5rem" }}>{this.render_tab_content()}</div>
          }
        />
      </div>
    );
  }
}
