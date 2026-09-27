/** Normalizes a saved Fracto main-server base URL. */
export const normalize_server_url = (value) => {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
};

/** Returns the valid, normalized URLs from a browser-local address book. */
export const normalize_server_urls = (address_book) => {
  if (!Array.isArray(address_book?.urls)) return [];
  return [
    ...new Set(address_book.urls.map(normalize_server_url).filter(Boolean)),
  ];
};

/** Adds one valid URL while retaining the URL-only AppSettings data contract. */
export const merge_server_url = (address_book, candidate) => {
  const normalized_url = normalize_server_url(candidate);
  if (!normalized_url) {
    return { accepted: false, address_book };
  }
  const urls = normalize_server_urls(address_book);
  if (!urls.includes(normalized_url)) urls.push(normalized_url);
  return { accepted: true, address_book: { urls } };
};

/** Clears only transient entry-form state, retaining the saved URL history. */
export const clear_server_url_entry_state = (state) => ({
  ...state,
  adding_server: false,
  server_url_draft: "",
  url_error: null,
});

/** Accepts only the supported public Fracto health response contract. */
export const is_health_contract_v1 = (health) =>
  health?.contract_version === 1 &&
  health.services !== null &&
  typeof health.services === "object" &&
  !Array.isArray(health.services);

/** Uses the live name when available and safely falls back to the URL host. */
export const get_remote_server_name = (health, server_url) => {
  if (typeof health?.server_name === "string" && health.server_name.trim()) {
    return health.server_name.trim();
  }
  try {
    return new URL(server_url).hostname;
  } catch {
    return "";
  }
};
