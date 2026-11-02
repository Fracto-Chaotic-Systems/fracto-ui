import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { timeline_geometry, zoom_scroll } from "./MidiTrackGeometry.js";

export default function useTrackViewport(duration) {
  const ref = useRef(null);
  const pending_scroll = useRef(null);
  const [viewport, set_viewport] = useState({
    width: 600,
    height: 400,
    left: 0,
    top: 0,
  });
  const [zoom, set_zoom] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    const measure = () =>
      set_viewport((previous) => ({
        ...previous,
        width: element.clientWidth,
        height: element.clientHeight,
        left: element.scrollLeft,
        top: element.scrollTop,
      }));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const geometry = timeline_geometry(duration, viewport.width, zoom);
  const change_zoom = (value) => {
    const next = timeline_geometry(duration, viewport.width, value);
    const left = zoom_scroll(
      viewport.left,
      geometry.scale,
      next.scale,
      geometry.width,
      next.extent,
    );
    set_zoom(value);
    set_viewport((previous) => ({ ...previous, left }));
    // Extent must be committed before setting a scroll position in it.
    pending_scroll.current = left;
  };
  useLayoutEffect(() => {
    if (pending_scroll.current !== null) {
      ref.current.scrollLeft = pending_scroll.current;
      pending_scroll.current = null;
    }
  }, [zoom]);
  const fit = () => {
    change_zoom(0);
    ref.current.scrollLeft = 0;
    set_viewport((previous) => ({ ...previous, left: 0 }));
    pending_scroll.current = 0;
  };
  const scroll_to = useCallback((left) => {
    const element = ref.current;
    element.scrollLeft = left;
    set_viewport((previous) =>
      previous.left === element.scrollLeft
        ? previous
        : { ...previous, left: element.scrollLeft },
    );
  }, []);
  return {
    ref,
    scroll_to,
    viewport,
    geometry,
    zoom,
    change_zoom,
    on_scroll: (event) => {
      const element = event.currentTarget;
      set_viewport((previous) => ({
        ...previous,
        left: element.scrollLeft,
        top: element.scrollTop,
      }));
    },
    fit,
  };
}
