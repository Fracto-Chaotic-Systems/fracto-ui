import React, { Component } from "react";
import PropTypes from "prop-types";

import CoolStyles from "./styles/CoolStyles.jsx";
import {
  CoolTableStyles as styles,
  CELL_ALIGN_CENTER,
  CELL_ALIGN_LEFT,
  CELL_ALIGN_RIGHT,
  CELL_TYPE_CALLBACK,
  CELL_TYPE_LINK,
  CELL_TYPE_NUMBER,
  CELL_TYPE_OBJECT,
  CELL_TYPE_TEXT,
  CELL_TYPE_TEXT_KEY,
  CELL_TYPE_TIME_AGO,
  TABLE_CAN_SELECT,
  TABLE_MULTI_SELECT,
  TABLE_NO_BORDER,
  TABLE_NO_HEADER,
} from "./styles/CoolTableStyles.jsx";
import ReactTimeAgo from "react-time-ago";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import AppText from "../../AppText.jsx";

TimeAgo.locale(en);

const COLUMN_ID_SELECT = "column_id_select";

const HEADER_COLUMN_SELECT = {
  id: COLUMN_ID_SELECT,
  label: "-",
  type: CELL_TYPE_OBJECT,
  width_px: 25,
  align: CELL_ALIGN_CENTER,
};

const DEFAULT_PAGE_SIZE = 25;

export class CoolTable extends Component {
  static propTypes = {
    columns: PropTypes.array.isRequired,
    data: PropTypes.array.isRequired,
    on_select_row: PropTypes.func,
    on_select_all: PropTypes.func,
    on_click_column: PropTypes.func,
    options: PropTypes.array,
    selected_row: PropTypes.number,
    selected_rows: PropTypes.array,
    scroll_selected_row: PropTypes.bool,
    table_style: PropTypes.object,
    render_special_row: PropTypes.func,
  };

  static defaultProps = {
    options: [],
    selected_row: -1,
    selected_rows: [],
    scroll_selected_row: false,
    table_style: {},
    render_special_row: null,
  };

  state = {
    scroller_ref: React.createRef(),
  };

  componentDidMount() {
    window.addEventListener("keydown", this.handleKeyDown);
    setTimeout(this.scroll_selection, 500);
  }

  componentDidUpdate(prevProps) {
    const { selected_row, scroll_selected_row } = this.props;
    if (
      scroll_selected_row &&
      prevProps.selected_row !== selected_row
    ) {
      this.scroll_selection();
    }
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  scroll_selection = async () => {
    const { selected_row, options, scroll_selected_row } = this.props;
    const { scroller_ref } = this.state;
    if (!options.includes(TABLE_CAN_SELECT)) {
      // console.log('scroll_selection: table is not selectable')
      // return;
    }
    if (!scroller_ref.current) {
      // console.log('scroll_selection: scroller_ref.current null')
      return;
    }
    if (selected_row < 0) {
      console.log("scroll_selection: selected_row < 0");
      return;
    }
    console.log("scrolling to", selected_row);
    scroller_ref.current.scrollIntoView(
      scroll_selected_row
        ? { behavior: "auto", block: "center" }
        : { behavior: "smooth" },
    );
  };

  handleKeyDown = (event) => {
    const { options, selected_row, data } = this.props;
    if (!options.includes(TABLE_CAN_SELECT)) {
      return;
    }
    if (event.key === "ArrowUp") {
      console.log("table ArrowUp");
      if (selected_row === 0) {
        return;
      }
      this.on_select_row(selected_row - 1);
    } else if (event.key === "ArrowDown") {
      console.log("table ArrowDown");
      if (selected_row === data.length - 1) {
        return;
      }
      this.on_select_row(selected_row + 1);
    } else if (event.key === "PageUp") {
      if (selected_row <= DEFAULT_PAGE_SIZE) {
        this.on_select_row(0);
      } else {
        this.on_select_row(selected_row - DEFAULT_PAGE_SIZE);
      }
      console.log("table PageUp");
    } else if (event.key === "PageDown") {
      if (selected_row + DEFAULT_PAGE_SIZE >= data.length - 1) {
        this.on_select_row(data.length - 1);
      } else {
        this.on_select_row(selected_row + DEFAULT_PAGE_SIZE);
      }
      console.log("table PageDown");
    }
    event.preventDefault(); // Prevents the page from scrolling
  };

  render_header_cell = (column) => {
    const { on_click_column } = this.props;
    const cell_style = column.width_px
      ? { minWidth: `${column.width_px}px` }
      : {};
    if (column.max_width_px) {
      cell_style.width = `${column.max_width_px}px`;
      cell_style.maxWidth = `${column.max_width_px}px`;
      cell_style.boxSizing = "border-box";
    }
    if (on_click_column) {
      cell_style.cursor = "pointer";
    }
    if (column.align) {
      switch (column.align) {
        case CELL_ALIGN_LEFT:
          cell_style["textAlign"] = "left";
          break;
        case CELL_ALIGN_RIGHT:
          cell_style["textAlign"] = "right";
          break;
        case CELL_ALIGN_CENTER:
          cell_style["textAlign"] = "center";
          break;
        default:
          console.log("unknown align option", column.align);
          break;
      }
    }
    const label = column.label_key
      ? AppText.get(column.label_key)
      : column.label;
    return (
      <styles.HeaderCell
        key={`header_cell-${column.id}`}
        onClick={(e) => (on_click_column ? on_click_column(column.id) : null)}
        style={cell_style}
      >
        <styles.HeaderSpan style={cell_style}>{label}</styles.HeaderSpan>
      </styles.HeaderCell>
    );
  };

  render_multi_select_header = (column) => {
    const { data, selected_rows, on_select_all } = this.props;
    const selected_count = new Set(selected_rows.filter(
      (row) => row >= 0 && row < data.length,
    )).size;
    const all_selected = data.length > 0 && selected_count === data.length;
    const partially_selected = selected_count > 0 && !all_selected;
    const cell_style = column.width_px
      ? { minWidth: `${column.width_px}px`, backgroundColor: "#888888" }
      : { backgroundColor: "#888888" };
    return (
      <styles.SelectorCell style={cell_style} key={`header-selector`}>
        <input
          type={"checkbox"}
          checked={all_selected}
          ref={(element) => {
            if (element) {
              element.indeterminate = partially_selected;
            }
          }}
          onChange={(e) => {
            e.stopPropagation();
            if (on_select_all) {
              on_select_all(e.target.checked, data.map((_, row) => row));
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </styles.SelectorCell>
    );
  };

  render_cell = (row, col, column, data, id, is_multi_select = false) => {
    const { selected_row, selected_rows } = this.props;
    // console.log("render_cell = (row, col, column, data, id)", row, col, column, data, id)
    let object_data = data;
    switch (column.type) {
      case CELL_TYPE_NUMBER:
        object_data = <styles.NumericSpan>{data}</styles.NumericSpan>;
        break;
      case CELL_TYPE_LINK:
        object_data = (
          <CoolStyles.LinkSpan
            onClick={(e) => {
              column.on_click(id, data);
            }}
          >
            {column.alias || data}
          </CoolStyles.LinkSpan>
        );
        break;
      case CELL_TYPE_TIME_AGO:
        object_data = <ReactTimeAgo date={data} />;
        break;
      case CELL_TYPE_CALLBACK:
        if (data[0] && typeof data[0] === "function") {
          object_data = data[0](data[1]);
        } else {
          console.log("unxpected data", data);
        }
        break;
      case CELL_TYPE_TEXT_KEY:
        object_data = AppText.get(data);
        break;
      case CELL_TYPE_OBJECT:
      case CELL_TYPE_TEXT:
      default:
        break;
    }
    let cell_style = { minWidth: `${column.width_px}px` };
    if (column.max_width_px) {
      cell_style.width = `${column.max_width_px}px`;
      cell_style.maxWidth = `${column.max_width_px}px`;
      cell_style.boxSizing = "border-box";
    }
    if (column.align) {
      switch (column.align) {
        case CELL_ALIGN_LEFT:
          cell_style["textAlign"] = "left";
          break;
        case CELL_ALIGN_RIGHT:
          cell_style["textAlign"] = "right";
          break;
        case CELL_ALIGN_CENTER:
          cell_style["textAlign"] = "center";
          break;
        default:
          console.log("unknown align option", column.align);
          break;
      }
    }
    if (column["style"]) {
      cell_style = {
        ...column["style"],
        ...cell_style,
      };
    }
    const row_is_selected =
      selected_row === row ||
      (is_multi_select && selected_rows.indexOf(row) >= 0);
    if (row_is_selected) {
      cell_style.backgroundColor = is_multi_select ? "white" : "#cccccc";
      return (
        <styles.TableCell
          style={cell_style}
          key={`cell-${row}-${col}`}
          onClick={column.stop_row_select ? (e) => e.stopPropagation() : null}
        >
          {object_data}
        </styles.TableCell>
      );
    }
    if (is_multi_select) {
      cell_style.backgroundColor = "#dddddd";
    }
    return (
      <styles.TableCell
        style={cell_style}
        key={`cell-${row}-${col}`}
        onClick={column.stop_row_select ? (e) => e.stopPropagation() : null}
      >
        {object_data}
      </styles.TableCell>
    );
  };

  render_empty_cell = (row, col, is_multi_select = false) => {
    const cell_style = is_multi_select ? { backgroundColor: "#dddddd" } : {};
    return <styles.TableCell style={cell_style} key={`cell-${row}-${col}`} />;
  };

  // required by the input control but unused
  on_selector_changed = (e, row) => {
    console.log(
      `on_selector_changed event on row #${row}, checked is ${e.target.checked}`,
    );
  };

  render_selector = (row, column, is_multi_select = false) => {
    const { selected_row, selected_rows } = this.props;
    const cell_style = column.width_px
      ? { minWidth: `${column.width_px}px` }
      : {};
    let is_checked = false;
    let row_in_array = false;
    if (selected_rows.indexOf(row) >= 0) {
      is_checked = true;
      row_in_array = true;
    }
    if (!row_in_array && selected_row === row) {
      is_checked = true;
    }
    if (is_multi_select) {
      cell_style.backgroundColor = is_checked ? "white" : "#dddddd";
    }
    return (
      <styles.SelectorCell style={cell_style} key={`selector-${row}`}>
        <input
          type={is_multi_select ? "checkbox" : "radio"}
          checked={is_checked}
          onChange={(e) => {
            if (is_multi_select) {
              e.stopPropagation();
              this.on_select_row(row);
            } else {
              this.on_selector_changed(e, row);
            }
          }}
          onClick={(e) => {
            if (is_multi_select) {
              e.stopPropagation();
            }
          }}
        />
      </styles.SelectorCell>
    );
  };

  on_select_row = (row) => {
    const { on_select_row } = this.props;
    if (on_select_row) {
      on_select_row(row);
    }
  };

  render() {
    const { scroller_ref } = this.state;
    const {
      columns,
      data,
      options,
      table_style,
      selected_row,
      selected_rows,
      render_special_row,
    } = this.props;
    const has_single_select = options.includes(TABLE_CAN_SELECT);
    const has_multi_select = options.includes(TABLE_MULTI_SELECT);
    if (has_single_select && has_multi_select) {
      console.error(
        "CoolTable selection options are mutually exclusive; using multi-select.",
      );
    }
    let columns_clone = columns.slice();
    if (has_single_select || has_multi_select) {
      columns_clone.unshift(HEADER_COLUMN_SELECT);
    }
    const table_rows = data.map((obj, row) => {
      if (render_special_row) {
        const special_row = render_special_row(
          obj,
          row,
          columns_clone.length,
        );
        if (special_row) return special_row;
      }
      const row_cells = columns_clone.map((column, col) => {
        if (column.id === COLUMN_ID_SELECT) {
          return this.render_selector(row, column, has_multi_select);
        } else if (obj[column.id] !== undefined) {
          return this.render_cell(
            row,
            col,
            column,
            obj[column.id],
            obj["id"],
            has_multi_select,
          );
        } else {
          return this.render_empty_cell(row, col, has_multi_select);
        }
      });
      const row_is_selected = selected_row === row;
      if (row_is_selected) {
        return (
          <styles.TableRow ref={scroller_ref} key={`row-${row}`}>
            {row_cells}
          </styles.TableRow>
        );
      } else {
        return (
          <styles.TableRow
            onClick={(e) => this.on_select_row(row, row_is_selected)}
            key={`row-${row}`}
          >
            {row_cells}
          </styles.TableRow>
        );
      }
    });
    let table_header = "";
    if (!options.includes(TABLE_NO_HEADER)) {
      const header_cells = columns_clone.map((column, i) => {
        if (column.id === COLUMN_ID_SELECT && has_multi_select) {
          return this.render_multi_select_header(column);
        }
        return this.render_header_cell(column);
      });
      table_header = <styles.TableHeader>{header_cells}</styles.TableHeader>;
    }
    const no_border = options.includes(TABLE_NO_BORDER);
    const extra_style = {
      ...table_style,
      border: !no_border ? "0.1rem solid #aaaaaa" : 0,
      borderRadius: !no_border ? "5px" : 0,
    };
    // if (selected_rows.length) {
    //    console.log('selected_rows', selected_rows)
    // }
    // const rows = options.includes(TABLE_NO_HEADER)
    //    ? <styles.TableBodyNoHeader>{table_rows}</styles.TableBodyNoHeader>
    //    : <styles.TableBody>{table_rows}</styles.TableBody>
    const rows = (
      <styles.TableBodyNoHeader>{table_rows}</styles.TableBodyNoHeader>
    );
    return (
      <CoolStyles.Table>
        <styles.TableScrollable style={extra_style}>
          {table_header}
          {rows}
        </styles.TableScrollable>
      </CoolStyles.Table>
    );
  }
}

export default CoolTable;
