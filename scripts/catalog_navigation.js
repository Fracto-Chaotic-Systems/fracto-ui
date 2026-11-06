import path from "node:path";
import { source_reader } from "./catalog_source_facts.js";
const fail = () => {
  throw new Error("UNSUPPORTED_CATALOG_SOURCE");
};

export const navigation_facts = (root, read) => {
  const reader = source_reader(root, read);
  const routes = reader.module("src/App.jsx").bindings.get("ROUTES")?.node;
  if (routes?.type !== "ArrayExpression") fail();
  return routes.elements.map((route) => {
    const entry = reader.properties(route),
      route_path = reader.value("src/App.jsx", entry.path);
    if (route_path === "/")
      return {
        id: "home",
        route: "/",
        component: reader.component_file("src/App.jsx", "PageWelcome"),
        label: {
          key: null,
          text: reader.value("src/App.jsx", entry.title),
          source: "src/App.jsx",
        },
        selection_key: null,
        settings_source: null,
        features: [],
      };
    if (entry.element?.type !== "JSXElement") fail();
    const file = reader.component_file(
      "src/App.jsx",
      entry.element.openingElement.name.name,
    );
    const id = route_path.slice(1);
    const sidebar = reader.module(file).bindings.get("SIDEBAR_LIST")?.node;
    if (sidebar?.type !== "ArrayExpression") fail();
    return {
      id,
      route: route_path,
      component: file,
      label: reader.text("src/App.jsx", entry.title_key.name),
      selection_key: reader.identifier(file, `KEY_${id.toUpperCase()}_SECTION`),
      settings_source: `src/settings/${path.posix.basename(file, ".jsx")}Settings.jsx`,
      features: sidebar.elements.flatMap((item) => {
        const feature = reader.properties(item);
        if (!feature.title_key) return [];
        const component =
          feature.right_pane.type === "NullLiteral"
            ? null
            : reader.component_file(
                file,
                feature.right_pane.openingElement.name.name,
              );
        const section = reader.value(file, feature.section_code);
        return [
          {
            id: section.replaceAll("_", "-"),
            section,
            component,
            label: reader.text(file, feature.title_key.name),
            title: component ? reader.title(component) : null,
            settings: component ? reader.settings(component) : [],
          },
        ];
      }),
    };
  });
};
