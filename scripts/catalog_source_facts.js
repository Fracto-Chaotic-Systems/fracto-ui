import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";

const fail = () => {
  throw new Error("UNSUPPORTED_CATALOG_SOURCE");
};
export const walk = (node, visit) => {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, visit));
    return;
  }
  if (node.type) visit(node);
  for (const [key, child] of Object.entries(node)) {
    if (!["loc", "start", "end", "extra", "comments", "tokens"].includes(key))
      walk(child, visit);
  }
};

/** Parse literal registry metadata only. Imported application modules never run. */
export const source_reader = (
  root,
  read = (file) => {
    const target = realpathSync(path.join(root, file));
    const relative = path.relative(realpathSync(root), target);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
      fail();
    return readFileSync(target, "utf8");
  },
) => {
  const cache = new Map();
  const module = (file) => {
    if (
      !/^src\/[A-Za-z0-9_./-]+\.jsx$/.test(file) ||
      file.split("/").includes("..")
    )
      fail();
    if (!cache.has(file)) {
      const ast = parse(read(file), { sourceType: "module", plugins: ["jsx"] });
      const bindings = new Map();
      for (const statement of ast.program.body) {
        const declaration = statement.declaration || statement;
        if (declaration.type === "VariableDeclaration") {
          declaration.declarations.forEach((entry) => {
            if (entry.id.type === "Identifier")
              bindings.set(entry.id.name, { node: entry.init });
          });
        }
        if (statement.type === "ImportDeclaration") {
          for (const specifier of statement.specifiers)
            bindings.set(specifier.local.name, {
              imported: specifier.imported?.name || "default",
              file: path.posix.normalize(
                path.posix.join(
                  path.posix.dirname(file),
                  statement.source.value,
                ),
              ),
            });
        }
      }
      cache.set(file, { ast, bindings });
    }
    return cache.get(file);
  };
  const value = (file, node, depth = 0) => {
    if (depth > 24 || !node) fail();
    if (
      ["StringLiteral", "NumericLiteral", "BooleanLiteral"].includes(node.type)
    )
      return node.value;
    if (node.type === "NullLiteral") return null;
    if (node.type === "Identifier") {
      const binding = module(file).bindings.get(node.name);
      if (!binding) fail();
      return binding.node
        ? value(file, binding.node, depth + 1)
        : identifier(binding.file, binding.imported, depth + 1);
    }
    if (node.type === "TemplateLiteral")
      return node.quasis
        .map(
          (part, i) =>
            part.value.cooked +
            (i < node.expressions.length
              ? value(file, node.expressions[i], depth + 1)
              : ""),
        )
        .join("");
    fail();
  };
  const identifier = (file, name, depth = 0) =>
    value(file, { type: "Identifier", name }, depth);
  const properties = (node) => {
    if (
      node?.type !== "ObjectExpression" ||
      node.properties.some(
        (entry) => entry.type !== "ObjectProperty" || entry.computed,
      )
    )
      fail();
    return Object.fromEntries(
      node.properties.map((entry) => [
        entry.key.name || entry.key.value,
        entry.value,
      ]),
    );
  };
  const text = (file, identifier_name) => {
    const binding = module(file).bindings.get(identifier_name);
    if (!binding) fail();
    if (!binding.node) return text(binding.file, binding.imported);
    const key = identifier(file, identifier_name);
    for (const entry of module(file).bindings.values()) {
      if (entry.node?.type !== "ObjectExpression") continue;
      for (const property of entry.node.properties) {
        if (
          property.type !== "ObjectProperty" ||
          !property.computed ||
          property.key.type !== "Identifier"
        )
          continue;
        if (identifier(file, property.key.name) === key)
          return { key, text: value(file, property.value), source: file };
      }
    }
    fail();
  };
  const component_file = (file, name) => {
    const binding = module(file).bindings.get(name);
    if (!binding || binding.imported !== "default") fail();
    return binding.file;
  };
  const title = (file) => {
    let result = null;
    walk(module(file).ast, (node) => {
      if (
        result ||
        node.type !== "JSXElement" ||
        node.openingElement.name.type !== "JSXMemberExpression" ||
        node.openingElement.name.property.name !== "SectionTitle"
      )
        return;
      walk(node.children, (child) => {
        if (
          !result &&
          child.type === "CallExpression" &&
          child.callee.type === "MemberExpression" &&
          child.callee.object.name === "AppText" &&
          child.callee.property.name === "get" &&
          child.arguments[0]?.type === "Identifier"
        )
          result = text(file, child.arguments[0].name);
      });
    });
    return result;
  };
  const settings = (file) => {
    const found = [];
    for (const [name, binding] of module(file).bindings) {
      if (
        name.startsWith("KEY_") &&
        binding.file?.startsWith("src/settings/")
      ) {
        const key = identifier(file, name);
        const source = module(binding.file);
        const declared = [...source.bindings.values()].some(
          (entry) =>
            entry.node?.type === "ObjectExpression" &&
            entry.node.properties.some(
              (property) =>
                property.type === "ObjectProperty" &&
                property.computed &&
                property.key.type === "Identifier" &&
                identifier(binding.file, property.key.name) === key,
            ),
        );
        if (declared) found.push({ key, source: binding.file });
      }
    }
    return found.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  };
  return {
    module,
    value,
    identifier,
    properties,
    text,
    component_file,
    title,
    settings,
  };
};
