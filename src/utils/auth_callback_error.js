/** Consume the callback failure marker without displaying provider-supplied text. */
export const consume_auth_callback_error = (location = window.location, history = window.history) => {
  const url = new URL(location.href);
  if (!url.searchParams.has("auth_error")) return false;
  url.searchParams.delete("auth_error");
  history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
  return true;
};
