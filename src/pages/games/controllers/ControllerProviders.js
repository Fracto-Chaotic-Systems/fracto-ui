// Swap this loader to replace the on-screen library without changing gameplay.
export const CONTROLLER_PROVIDERS = {
  on_screen: async () => {
    const { create_controller } = await import("./VirtualGamepadAdapter.js");
    return create_controller;
  },
};
