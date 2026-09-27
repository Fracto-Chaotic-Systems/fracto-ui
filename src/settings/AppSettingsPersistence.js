/** Serializes a persistent object or array when it fits its configured limit. */
export const serialize_persisted_object = (setting_definition, value) => {
  const persist_value =
    Array.isArray(setting_definition.persist_fields) &&
    value &&
    typeof value === "object"
      ? Object.fromEntries(
          setting_definition.persist_fields
            .filter((field) => field in value)
            .map((field) => [field, value[field]]),
        )
      : value;
  const serialized_value = JSON.stringify(persist_value);
  const max_persist_length = setting_definition.max_persist_length ?? 1000;
  return serialized_value.length <= max_persist_length ? serialized_value : null;
};

/** Persists an object or array and reports whether it fit the configured limit. */
export const persist_object_setting = (
  storage,
  key,
  setting_definition,
  value,
) => {
  const serialized_value = serialize_persisted_object(setting_definition, value);
  if (serialized_value === null) return false;
  storage.setItem(key, serialized_value);
  return true;
};

/** Restores a previously serialized object or array setting. */
export const parse_persisted_object = (serialized_value) =>
  serialized_value ? JSON.parse(serialized_value) : null;
