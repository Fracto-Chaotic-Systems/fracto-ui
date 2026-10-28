import React from "react";
import AppText from "../../AppText.jsx";
import { TERRAIN_TEXT } from "../../text/AssetsText.jsx";
import { TerrainLightingControls } from "./SimulatorTerrainStyles.jsx";

export default function SimulatorTerrainLightingControls({ settings, on_change }) {
  return <TerrainLightingControls>
    <label><input type="checkbox" checked={settings.enabled}
      onChange={(event) => on_change("enabled", event.target.checked)} />
      {AppText.get(TERRAIN_TEXT.lighting)}</label>
    {[
      ["ambient", 0, 1, 0.05], ["intensity", 0, 2, 0.05],
      ["azimuth", 0, 360, 5], ["elevation", 5, 90, 5],
    ].map(([key, min, max, step]) => <label key={key}>
      {AppText.get(TERRAIN_TEXT[key])}
      <input type="range" min={min} max={max} step={step} disabled={!settings.enabled}
        value={settings[key]} onChange={(event) => on_change(key, Number(event.target.value))} />
      <output>{key === "azimuth" || key === "elevation" ? `${settings[key]}°` : settings[key].toFixed(2)}</output>
    </label>)}
  </TerrainLightingControls>;
}
