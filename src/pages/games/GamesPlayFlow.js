// Development launches directly into play. Reset explicitly starts a new prelude.
export const INITIAL_PLAY_FLOW = Object.freeze({
  phase: "interactive",
  run: 0,
  tv_visible: true,
});

export function play_flow_reducer(state, event) {
  switch (event.type) {
    case "reset":
      return {
        phase: "prelude",
        run: state.run + 1,
        tv_visible: false,
        background_prepared: false,
      };
    case "prelude_background_prepare":
      return state.phase === "prelude" && event.run === state.run
        ? { ...state, background_prepared: true }
        : state;
    case "prelude_tv_reveal":
      return state.phase === "prelude" && event.run === state.run
        ? { ...state, tv_visible: true }
        : state;
    case "prelude_complete":
      return state.phase === "prelude" && event.run === state.run
        ? { ...state, phase: "confirmation", tv_visible: true }
        : state;
    case "skip_prelude":
      // Future asynchronous prelude steps must not complete an abandoned run.
      return state.phase === "prelude" && event.run === state.run
        ? { ...state, phase: "confirmation", tv_visible: true }
        : state;
    case "confirm":
      return state.phase === "confirmation" && event.run === state.run
        ? { ...state, phase: "interactive", tv_visible: true }
        : state;
    default:
      throw new Error("invalid_play_flow_event");
  }
}
