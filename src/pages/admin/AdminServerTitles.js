/** Custom titles are local labels; remote identities and URLs are unchanged. */
export const server_title = (titles, key, fallback) =>
  typeof titles?.[key] === "string" && titles[key].trim()
    ? titles[key].trim()
    : fallback;

export const update_server_title = (titles, key, value) => {
  const next = { ...titles };
  const title = value.replace(/[\r\n]+/g, " ").trim();
  if (title) next[key] = title;
  else delete next[key];
  return next;
};
