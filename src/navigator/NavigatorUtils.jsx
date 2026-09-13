import {
  NavigatorStyles as styles,
  WIDTH_CROSSHAIR_LINE_PX,
} from "../styles/NavigatorStyles.jsx";

const CENTER_BOX_HALF_PX = 7;

export class NavigatorUtils {
  static on_mouse_move_not = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  static render_cross_hairs = (
    image_bounds,
    client_point,
    on_click,
    angle = 0,
    in_bold = false,
  ) => {
    const thickness_px = in_bold
      ? 1.25 * WIDTH_CROSSHAIR_LINE_PX
      : WIDTH_CROSSHAIR_LINE_PX;
    const opacity = in_bold ? 0.85 : 0.5;
    const relative_x = client_point.x - image_bounds.left;
    const relative_y = client_point.y - image_bounds.top;
    const horizontal_left_style = {
      top: `${relative_y || -1}px`,
      left: "-4px",
      width: `${relative_x - 3}px`,
      transform: `rotate(${angle}deg)`,
      transformOrigin: `105% 105%`,
      height: `${thickness_px}px`,
      opacity: opacity,
    };
    const horizontal_right_style = {
      top: `${relative_y || -1}px`,
      left: `${relative_x + 10}px`,
      width: `${image_bounds.width - relative_x - 6}px`,
      transform: `rotate(${angle}deg)`,
      transformOrigin: `-5% -5%`,
      height: `${thickness_px}px`,
      opacity: opacity,
    };
    const vertical_top_style = {
      left: `${relative_x || -1}px`,
      top: "-3px",
      height: `${relative_y - 4}px`,
      transform: `rotate(${angle}deg)`,
      transformOrigin: `105% 105%`,
      width: `${thickness_px}px`,
      opacity: opacity,
    };
    const vertical_bottom_style = {
      left: `${relative_x || -1}px`,
      top: `${relative_y + 10}px`,
      height: `${image_bounds.height - relative_y - 10}px`,
      transform: `rotate(${angle}deg)`,
      transformOrigin: `-5% -5%`,
      width: `${thickness_px}px`,
      opacity: opacity,
    };
    const box_top_style = {
      left: `${relative_x - CENTER_BOX_HALF_PX}px`,
      width: `${2 * CENTER_BOX_HALF_PX + 2}px`,
      top: `${relative_y - CENTER_BOX_HALF_PX - 1}px`,
      height: `${thickness_px}px`,
      opacity: opacity,
    };
    const box_bottom_style = {
      left: `${relative_x - CENTER_BOX_HALF_PX}px`,
      width: `${2 * CENTER_BOX_HALF_PX + 2}px`,
      top: `${relative_y + CENTER_BOX_HALF_PX + 1}px`,
      height: `${thickness_px}px`,
      opacity: opacity,
    };
    const box_left_style = {
      top: `${relative_y - CENTER_BOX_HALF_PX}px`,
      left: `${relative_x - CENTER_BOX_HALF_PX - 1}px`,
      height: `${2 * CENTER_BOX_HALF_PX + 2}px`,
      width: `${thickness_px}px`,
      opacity: opacity,
    };
    const box_right_style = {
      top: `${relative_y - CENTER_BOX_HALF_PX}px`,
      left: `${relative_x + CENTER_BOX_HALF_PX + 1}px`,
      height: `${2 * CENTER_BOX_HALF_PX + 2}px`,
      width: `${thickness_px}px`,
      opacity: opacity,
    };
    return [
      <styles.HorizontalCrossHair
        key={"horizontal-crosshair-left"}
        style={horizontal_left_style}
        onClick={on_click}
        onMouseMove={NavigatorUtils.on_mouse_move_not}
      />,
      <styles.HorizontalCrossHair
        key={"horizontal-crosshair-right"}
        style={horizontal_right_style}
        onClick={on_click}
        onMouseMove={NavigatorUtils.on_mouse_move_not}
      />,
      <styles.VerticalCrossHair
        key={"vertical-crosshair-top"}
        style={vertical_top_style}
        onClick={on_click}
        onMouseMove={NavigatorUtils.on_mouse_move_not}
      />,
      <styles.VerticalCrossHair
        key={"vertical-crosshair-bottom"}
        style={vertical_bottom_style}
        onClick={on_click}
        onMouseMove={NavigatorUtils.on_mouse_move_not}
      />,
      <styles.BoxTopBottom
        key={"center-box-top"}
        style={box_top_style}
        onClick={on_click}
        onMouseMove={NavigatorUtils.on_mouse_move_not}
      />,
      <styles.BoxTopBottom
        key={"center-box-bottom"}
        style={box_bottom_style}
        onClick={on_click}
        onMouseMove={NavigatorUtils.on_mouse_move_not}
      />,
      <styles.BoxLeftRight
        key={"center-box-left"}
        style={box_left_style}
        onClick={on_click}
        onMouseMove={NavigatorUtils.on_mouse_move_not}
      />,
      <styles.BoxLeftRight
        key={"center-box-right"}
        style={box_right_style}
        onClick={on_click}
        onMouseMove={NavigatorUtils.on_mouse_move_not}
      />,
    ];
  };
}

export default NavigatorUtils;
