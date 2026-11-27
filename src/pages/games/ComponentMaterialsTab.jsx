import { Fragment, useEffect, useMemo, useState } from "react";
import AppText from "../../AppText.jsx";
import { COMPONENT_STAGE_TEXT } from "../../text/GamesText.jsx";
import { fetch_inventory_assets } from "./InventoryAssetRequest.js";
import {
  component_material_usage,
  group_material_usage,
} from "./ComponentMaterialUsage.js";
import { MaterialUsageTable } from "./ComponentStageStyles.jsx";

const text = (key) => AppText.get(COMPONENT_STAGE_TEXT[key]);
const fill = (template, values) =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template ?? "",
  );
const number = (value, digits) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const scale_text = (row) =>
  row.scale_min === null
    ? "—"
    : row.scale_min === row.scale_max
      ? `${number(row.scale_min, 2)}×`
      : `${number(row.scale_min, 2)}–${number(row.scale_max, 2)}×`;

/** The "materials" tab: which materials build the component, and how much of each. */
export default function ComponentMaterialsTab({ document }) {
  const usage = useMemo(() => component_material_usage(document), [document]);
  const [catalog, set_catalog] = useState({});
  const [expanded, set_expanded] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch_inventory_assets(
      `${import.meta.env.BASE_URL}api/environment-catalog?category=material`,
      { signal: controller.signal },
    )
      .then((assets) =>
        set_catalog(
          Object.fromEntries(assets.map((asset) => [asset.id, asset])),
        ),
      )
      // Without the catalog the table lists IDs and groups by ID prefix.
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const rows = useMemo(
    () => group_material_usage(usage.materials, catalog),
    [usage, catalog],
  );
  if (!usage.materials.length) return <p>{text("materials_none")}</p>;
  // Scatter and floor columns appear only when the component uses them.
  const scatters = usage.scatter_rules > 0;
  const floor = usage.floor_area !== null;
  const columns = 4 + (scatters ? 3 : 0) + (floor ? 2 : 0);
  const cells = (row) => (
    <>
      <td>
        {row.placed || "—"}
        {row.moving > 0 && (
          <small>{fill(text("materials_moving"), { count: row.moving })}</small>
        )}
      </td>
      {scatters && (
        <td>
          {row.scatter_rules ? row.scattered : "—"}
          {row.scatter_rules > 0 && (
            <small>
              {fill(
                text(
                  row.scatter_rules === 1
                    ? "materials_rule"
                    : "materials_rules",
                ),
                { count: row.scatter_rules },
              )}
            </small>
          )}
        </td>
      )}
      <td>{row.instances || "—"}</td>
      <td>{scale_text(row)}</td>
      {scatters && (
        <>
          <td>
            {row.scatter_rules ? `${number(row.scatter_area, 1)} m²` : "—"}
          </td>
          <td>{row.density === null ? "—" : number(row.density, 2)}</td>
        </>
      )}
      {floor && (
        <>
          <td>
            {row.per_floor_m2 === null ? "—" : number(row.per_floor_m2, 2)}
          </td>
          <td>
            {row.floor ? (
              <>
                {`${number(row.floor.width, 1)} × ${number(row.floor.depth, 1)} m`}
                <small>
                  {fill(text("materials_tiling"), {
                    u: number(row.floor.repeat[0], 1),
                    v: number(row.floor.repeat[1], 1),
                  })}
                </small>
              </>
            ) : (
              "—"
            )}
          </td>
        </>
      )}
    </>
  );
  const name = (entry) => (
    <>
      {catalog[entry.id]?.name ?? entry.id}
      {catalog[entry.id] && <small>{entry.id}</small>}
      {entry.revisions?.length > 1 && (
        <small>
          {fill(text("materials_revisions"), {
            count: entry.revisions.length,
          })}
        </small>
      )}
    </>
  );
  return (
    <MaterialUsageTable>
      <thead>
        <tr>
          <th scope="col">{text("materials_material")}</th>
          <th scope="col">{text("materials_placed")}</th>
          {scatters && <th scope="col">{text("materials_scattered")}</th>}
          <th scope="col">{text("materials_total")}</th>
          <th scope="col">{text("materials_scale")}</th>
          {scatters && (
            <>
              <th scope="col">{text("materials_area")}</th>
              <th scope="col">{text("materials_density")}</th>
            </>
          )}
          {floor && (
            <>
              <th scope="col">{text("materials_per_floor")}</th>
              <th scope="col">{text("materials_floor")}</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) =>
          row.kind === "group" ? (
            <Fragment key={`group:${row.id}`}>
              <tr className="material-group">
                <th scope="row">
                  <button
                    type="button"
                    aria-expanded={expanded.includes(row.id)}
                    onClick={() =>
                      set_expanded((current) =>
                        current.includes(row.id)
                          ? current.filter((id) => id !== row.id)
                          : [...current, row.id],
                      )
                    }
                  >
                    {expanded.includes(row.id) ? "▾" : "▸"} {row.id}
                  </button>
                  <small>
                    {fill(text("materials_count"), {
                      count: row.members.length,
                    })}
                  </small>
                </th>
                {cells(row)}
              </tr>
              {expanded.includes(row.id) &&
                row.members.map((member) => (
                  <tr key={member.id} className="material-member">
                    <th scope="row">{name(member)}</th>
                    {cells(member)}
                  </tr>
                ))}
            </Fragment>
          ) : (
            <tr key={row.id}>
              <th scope="row">{name(row)}</th>
              {cells(row)}
            </tr>
          ),
        )}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">
            {fill(text("materials_count"), { count: usage.materials.length })}
          </th>
          <td colSpan={columns}>
            {fill(text("materials_instances"), {
              count: usage.instances,
              limit: usage.limit,
            })}
            {floor &&
              ` · ${fill(text("materials_floor_area"), {
                area: number(usage.floor_area, 1),
              })}`}
          </td>
        </tr>
      </tfoot>
    </MaterialUsageTable>
  );
}
