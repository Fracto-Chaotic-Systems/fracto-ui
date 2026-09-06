import React from "react";
import styled from "styled-components";
import { CoolStyles } from "./ui/CoolImports.jsx";
import { copy } from "./ui/CoolIcons.jsx";
import { MainStyles as styles } from "../styles/MainStyles.jsx";
import CoolColors from "./ui/CoolColors.jsx";
import AppSettings from "../AppSettings.jsx";
import { KEY_CLIPBOARD_DATA } from "../settings/RootSettings.jsx";
import { KEY_NAVIGATOR_FOCAL_POINT } from "../text/NavigatorText.jsx";

export const NumberSpan = styled.span`
  ${CoolStyles.monospace}
  ${CoolStyles.deep_blue_text}
    font-size: 0.95rem;
`;
const ItalicSpan = styled.span`
  ${CoolStyles.bold}
  ${CoolStyles.italic}
    ${CoolStyles.deep_blue_text}
    font-family: sans-serif;
  font-size: 0.95rem;
`;

export const getViewportDimensions = () => {
  let viewport = {};
  if (typeof window.innerWidth != "undefined") {
    viewport.width = window.innerWidth;
    viewport.height = window.innerHeight;
  } else if (
    typeof document.documentElement !== "undefined" &&
    typeof document.documentElement.clientWidth !== "undefined" &&
    document.documentElement.clientWidth !== 0
  ) {
    viewport.width = document.documentElement.clientWidth;
    viewport.height = document.documentElement.clientHeight;
  } else {
    viewport.width = document.getElementsByTagName("body")[0].clientWidth;
    viewport.height = document.getElementsByTagName("body")[0].clientHeight;
  }
  return viewport;
};

export const copy_json = (json) => {
  return JSON.parse(JSON.stringify(json));
};

export const random_id = (preface = "id") => {
  return `${preface}_${Math.floor(Math.random() * 100000000)}`;
};

export const round_places = (x, digits) => {
  const factor = Math.pow(10, digits);
  return Math.round(x * factor) / factor;
};

export const copy_clipboard = (copy_name, copy_value) => {
  const clipboard_data = AppSettings.get(KEY_CLIPBOARD_DATA);
  clipboard_data[copy_name] = copy_value;
  AppSettings.on_settings_changed({
    [KEY_CLIPBOARD_DATA]: clipboard_data,
  });
};

export const paste_clipboard = (paste_name, paste_key) => {
  const clipboard_data = AppSettings.get(KEY_CLIPBOARD_DATA);
  console.log("paste_clipboard,paste_name, paste_key", paste_name, paste_key);
  AppSettings.on_settings_changed({
    [paste_key]: clipboard_data[paste_name],
  });
};

export const render_coordinates = (
  point,
  digits = 12,
  copy_name = "focal_point",
) => {
  if (!point || (!point.x && !point.y)) {
    return <NumberSpan>---</NumberSpan>;
  }
  const x_rounded = round_places(point?.x, digits);
  const y_rounded = round_places(point?.y, digits);
  const icon_style = {
    width: `20px`,
    height: `20px`,
    fill: CoolColors.cool_blue,
    marginLeft: "0.25rem",
  };
  return [
    <NumberSpan key={"number-part"}>{`${x_rounded}+${y_rounded}`}</NumberSpan>,
    <ItalicSpan key={"just-i"}>i</ItalicSpan>,
  ];
};

export const render_scalar = (x, digits = 10) => {
  const x_rounded = round_places(x, digits);
  return <NumberSpan>{x_rounded}</NumberSpan>;
};
