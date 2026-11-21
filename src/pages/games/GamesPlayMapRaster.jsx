import { useLayoutEffect, useState } from "react";
import FractoRasterImage from "../../utils/render/FractoRasterImage.jsx";
import { create_parchment_map_painter, PARCHMENT_MAP_VIEW } from "./GamesPlayMap.js";

export default function GamesPlayMapRaster({ display_width }) {
  const [painter] = useState(create_parchment_map_painter);
  useLayoutEffect(() => {
    painter.resize(display_width);
  }, [painter, display_width]);
  return (
    <FractoRasterImage
      {...PARCHMENT_MAP_VIEW}
      on_plan_complete={painter.on_plan_complete}
    />
  );
}
