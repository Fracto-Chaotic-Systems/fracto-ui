import { GamepadEmulator } from "virtual-gamepad-lib/GamepadEmulator";
import { GamepadApiWrapper } from "virtual-gamepad-lib/GamepadApiWrapper";
import { setupPresetInteractiveGamepad } from "virtual-gamepad-lib/helpers";
import svg from "virtual-gamepad-lib/gamepad_assets/rounded/display-gamepad-full.svg?raw";
import "virtual-gamepad-lib/gamepad_assets/base.css";
import "./VirtualGamepad.css";
import { mount_virtual_gamepad } from "./VirtualGamepadRuntime.js";
import { apply_virtual_gamepad_skin } from "./VirtualGamepadSkin.js";

const styled_svg = apply_virtual_gamepad_skin(svg);

export function create_controller(host, options) {
  return mount_virtual_gamepad(host, options, {
    GamepadEmulator,
    GamepadApiWrapper,
    setupPresetInteractiveGamepad,
    svg: styled_svg,
    environment: { window, document, navigator },
  });
}
