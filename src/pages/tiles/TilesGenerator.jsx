import React, { Component } from "react";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import { KEY_TILES_GENERATE } from "../../text/TilesText.jsx";
import PageAutomation, {
  PAGE_MODE_OPERATOR,
} from "../utils/PageAutomation.jsx";

import { INCLUDE_CAN_DO } from "../../utils/render/FractoTileCoverage.jsx";
import { TILE_GENERATOR_SPLITTER_KEYS } from "../../navigator/NavigatorKeys.jsx";

import NavigatorCoverage from "../../navigator/NavigatorCoverage.jsx";
import GeneratorControl from "./generator/GeneratorControl.jsx";
import GeneratorOperations from "./generator/GeneratorOperations.jsx";
import { get_visible_coverage_levels } from "../assets/AssetsUtils.jsx";

export class TilesGenerator extends Component {
  state = {
    coverage_data: [],
    heat_map_buffer: [],
    selected_coverage_levels: [],
    short_codes: [],
    width_px: 0,
    height_px: 0,
    generate_level: 0,
    generate_code: "",
    automation_mode: PAGE_MODE_OPERATOR,
  };

  on_coverage_data = (coverage_data, heat_map_buffer) => {
    // console.log('on_coverage_data', coverage_data)
    this.setState({
      coverage_data,
      heat_map_buffer,
      selected_coverage_levels: get_visible_coverage_levels(
        coverage_data,
        heat_map_buffer,
      ),
    });
  };

  on_coverage_levels_changed = (selected_coverage_levels) => {
    this.setState({ selected_coverage_levels });
  };

  on_generate = (tiles, level, generate_code) => {
    const short_codes = tiles.map((tile, i) => {
      return tile.short_code;
    });
    console.log(
      `on_generate ${generate_code}`,
      short_codes ? short_codes.length : 0,
    );
    this.setState({
      short_codes,
      generate_level: level,
      generate_code,
    });
  };

  control_block = () => {
    const { coverage_data, selected_coverage_levels } = this.state;
    return (
      <GeneratorControl
        automation_mode={this.state.automation_mode}
        coverage_data={coverage_data}
        heat_map_buffer={this.state.heat_map_buffer}
        selected_levels={selected_coverage_levels}
        on_coverage_levels_changed={this.on_coverage_levels_changed}
        on_generate={this.on_generate}
      />
    );
  };

  operations_block = () => {
    const { coverage_data, short_codes, generate_code } = this.state;
    if (!coverage_data) {
      return [];
    }
    return (
      <GeneratorOperations
        automation_mode={this.state.automation_mode}
        short_codes={short_codes}
        generate_code={generate_code}
      />
    );
  };

  on_resize = (new_width_px, new_height_px) => {
    const { width_px, height_px } = this.state;
    if (new_width_px === width_px && new_height_px === height_px) {
      return;
    }
    this.setState({
      width_px: new_width_px,
      height_px: new_height_px,
    });
    console.log(`size is ${new_width_px}x${new_height_px}`);
  };

  on_automation_mode_change = (automation_mode) => {
    this.setState({ automation_mode });
  };

  render() {
    return [
      <styles.SectionTitle
        key={"tiles-overview-title"}
        style={{ position: "relative" }}
      >
        {AppText.get(KEY_TILES_GENERATE)}
        <PageAutomation
          automation_type="tiles_generator"
          on_mode_change={this.on_automation_mode_change}
        />
      </styles.SectionTitle>,
      <NavigatorCoverage
        splitter_keys={TILE_GENERATOR_SPLITTER_KEYS}
        control_block={this.control_block()}
        results_block={this.operations_block()}
        on_coverage_data={this.on_coverage_data}
        on_resize={this.on_resize}
        options={[INCLUDE_CAN_DO]}
        selected_levels={this.state.selected_coverage_levels}
      />,
    ];
  }
}

export default TilesGenerator;
