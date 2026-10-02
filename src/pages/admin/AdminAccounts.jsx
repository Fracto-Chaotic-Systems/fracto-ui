import { Component } from "react";

import { MainStyles as styles } from "../../styles/MainStyles.jsx";
import AppText from "../../AppText.jsx";
import AdminBackend from "../../backend/AdminBackend.jsx";
import CoolTable from "../../utils/ui/CoolTable.jsx";
import CoolStyles from "../../utils/ui/styles/CoolStyles.jsx";
import {
  CELL_ALIGN_LEFT,
  CELL_TYPE_NUMBER,
  CELL_TYPE_TEXT,
} from "../../utils/ui/styles/CoolTableStyles.jsx";
import {
  KEY_ADMIN_ACCOUNTS_EMPTY,
  KEY_ADMIN_ACCOUNTS_ERROR,
  KEY_ADMIN_ACCOUNTS_LOADING,
  KEY_ADMIN_ACCOUNTS_TITLE,
} from "../../text/AdminText.jsx";

const cell_text = (value) => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const table_columns = (source_records) => {
  const fields = [
    ...new Set(source_records.flatMap((record) => Object.keys(record))),
  ];
  return fields.map((field) => {
    const values = source_records.map((record) => cell_text(record[field]));
    const width_px = Math.min(
      260,
      Math.max(80, Math.max(field.length, ...values.map((value) => value.length)) * 8 + 20),
    );
    const sample = source_records.find(
      (record) => record[field] !== null && record[field] !== undefined,
    )?.[field];
    return {
      id: field,
      label: field,
      type: typeof sample === "number" ? CELL_TYPE_NUMBER : CELL_TYPE_TEXT,
      width_px,
      max_width_px: width_px,
      align: CELL_ALIGN_LEFT,
      style: {
        backgroundColor: "white",
        fontFamily: "monospace",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
    };
  });
};

/** Lists the user records returned by the administrator-only users endpoint. */
export class AdminAccounts extends Component {
  state = { users: [], loading: true, error: null };

  componentDidMount() {
    this.load_users();
  }

  componentWillUnmount() {
    this.unmounted = true;
  }

  load_users = async () => {
    try {
      const payload = await AdminBackend.users();
      if (!this.unmounted) {
        this.setState({
          users: Array.isArray(payload?.result) ? payload.result : [],
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      if (!this.unmounted) {
        this.setState({ loading: false, error: error.message });
      }
    }
  };

  render() {
    const { users, loading, error } = this.state;
    const records = users.map((user) =>
      Object.fromEntries(
        Object.entries(user).map(([field, value]) => [field, cell_text(value)]),
      ),
    );
    return (
      <CoolStyles.Block style={{ height: "100%", overflow: "hidden" }}>
        <styles.SectionTitle>
          {AppText.get(KEY_ADMIN_ACCOUNTS_TITLE)}
        </styles.SectionTitle>
        <CoolStyles.Block style={{ padding: "0.5rem", overflow: "auto" }}>
          {loading && <div>{AppText.get(KEY_ADMIN_ACCOUNTS_LOADING)}</div>}
          {error && (
            <div style={{ color: "#b22222" }}>
              {AppText.get(KEY_ADMIN_ACCOUNTS_ERROR)} {error}
            </div>
          )}
          {!loading && !error && records.length === 0 && (
            <div>{AppText.get(KEY_ADMIN_ACCOUNTS_EMPTY)}</div>
          )}
          {!loading && !error && records.length > 0 && (
            <CoolTable
              columns={table_columns(users)}
              data={records}
              table_style={{
                overflowX: "auto",
                overflowY: "auto",
                maxHeight: "calc(100vh - 100px)",
              }}
            />
          )}
        </CoolStyles.Block>
      </CoolStyles.Block>
    );
  }
}

export default AdminAccounts;
