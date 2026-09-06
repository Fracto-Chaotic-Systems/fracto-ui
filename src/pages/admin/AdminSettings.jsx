import { Component } from "react";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import { KEY_ADMIN_SETTINGS } from "../../text/AdminText.jsx";
import AppText from "../../AppText.jsx";
import AppSettings, { TYPE_OBJECT } from "../../AppSettings.jsx";
import {
  CELL_ALIGN_LEFT,
  CELL_ALIGN_RIGHT,
  CELL_TYPE_TEXT,
} from "../../utils/ui/styles/CoolTableStyles.jsx";
import CoolTable from "../../utils/ui/CoolTable.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";

const REFRESH_INTERVAL_MS = 3000;

const TABLE_COLUMNS = [
  {
    id: "key",
    label: "key",
    type: CELL_TYPE_TEXT,
    width_px: 350,
    align: CELL_ALIGN_RIGHT,
    style: {
      textTransform: "uppercase",
      backgroundColor: "#aaaaaa",
      textShadow: "4px 4px 10px #333333",
      paddingRight: "5px",
      color: "white",
      fontSize: "14px",
      fontWeight: "bold",
      verticalAlign: "top",
      height: "24px",
    },
  },
  {
    id: "value",
    label: "value",
    type: CELL_TYPE_TEXT,
    width_px: 500,
    align: CELL_ALIGN_LEFT,
    style: {
      backgroundColor: "white",
    },
  },
];

export class AdminSettings extends Component {
  state = {
    interval: null,
    setting_data: [],
  };

  componentDidMount() {
    this.refresh_keys();
    const interval = setInterval(this.refresh_keys, REFRESH_INTERVAL_MS);
    this.setState({ interval });
  }

  componentWillUnmount() {
    const { interval } = this.state;
    if (interval) {
      clearInterval(interval);
    }
  }

  refresh_keys = () => {
    const settings_keys = Object.keys(AppSettings.settings_data);
    const setting_data = settings_keys.sort().map((key, i) => {
      const setting_definition = AppSettings.setting_definitions[key];
      let data_value = AppSettings.settings_data[key];
      if (typeof data_value === "object") {
        const keys = Object.keys(data_value);
        data_value = `{${keys.join(", ")}}`;
      }
      return { key, data_value };
    });
    this.setState({ setting_data });
  };

  render_settings = () => {
    const { setting_data } = this.state;
    const table_data = setting_data.map((setting) => {
      return { key: setting.key, value: setting.data_value };
    });
    return (
      <CoolStyles.InlineBlock>
        <CoolTable columns={TABLE_COLUMNS} data={table_data} />
      </CoolStyles.InlineBlock>
    );
  };

  render() {
    const settings = this.render_settings();
    return [
      <styles.SectionTitle key={"admin-settings-title"}>
        {AppText.get(KEY_ADMIN_SETTINGS)}
      </styles.SectionTitle>,
      <styles.CenteredBlock key={"input-form"}>
        {settings}
      </styles.CenteredBlock>,
    ];
  }
}

export default AdminSettings;
