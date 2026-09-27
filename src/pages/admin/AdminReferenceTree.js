/** Convert the Reference API response into the checkout's root/servers hierarchy. */
export const build_reference_tree = (repositories) => {
  const documents = [];
  const repository_by_name = new Map(repositories.map((repository) => [repository.name, repository]));
  const main_repository = repository_by_name.get("fracto") || {
    name: "fracto",
    files: [],
  };
  const main_root = {
    key: "repository:fracto",
    title: "fracto",
    isLeaf: false,
    children: [],
    repository: "fracto",
    folder_path: "",
  };

  const add_repository_files = (repository, repository_root) => {
    const folders = new Map([
      ["", { node: repository_root, children: repository_root.children }],
    ]);
    const ensure_folder = (folder_path) => {
      let parent_path = "";
      for (const segment of folder_path.split("/").filter(Boolean)) {
        const current_path = parent_path ? `${parent_path}/${segment}` : segment;
        if (!folders.has(current_path)) {
          const folder = {
            key: `${repository_root.key}/${current_path}`,
            title: segment,
            label: segment,
            isLeaf: false,
            children: [],
            repository: repository.name,
            folder_path: current_path,
          };
          folders.set(current_path, { node: folder, children: folder.children });
          folders.get(parent_path).children.push(folder);
        }
        parent_path = current_path;
      }
      return folders.get(folder_path);
    };

    (repository.folders || []).forEach(ensure_folder);
    (repository.files || []).forEach((file_path) => {
      if (typeof file_path !== "string") return;
      const segments = file_path.split("/").filter(Boolean);
      if (!segments.length) return;
      const document = {
        id: JSON.stringify([repository.name, file_path]),
        repository: repository.name,
        path: file_path,
        tree_key: null,
      };
      documents.push(document);
      const parent_path = segments.slice(0, -1).join("/");
      ensure_folder(parent_path);
      const containing_folder = folders.get(parent_path).node;
      if (segments[segments.length - 1].toLowerCase() === "readme.md") {
        containing_folder.readme_document_id = document.id;
        document.tree_key = containing_folder.key;
      } else {
        document.tree_key = `document:${document.id}`;
        const file_name = segments[segments.length - 1];
        folders.get(parent_path).children.push({
          key: document.tree_key,
          title: file_name.replace(/\.md$/i, "").toLowerCase(),
          isLeaf: true,
          document_id: document.id,
        });
      }
    });

  };

  add_repository_files(main_repository, main_root);

  const service_repositories = repositories.filter(
    (repository) => repository.name !== "fracto",
  );
  const service_roots = service_repositories.map((repository) => {
    const repository_root = {
      key: `${main_root.key}/servers/${repository.name}`,
      title: repository.name,
      isLeaf: false,
      children: [],
      repository: repository.name,
      folder_path: "",
    };
    add_repository_files(repository, repository_root);
    return repository_root;
  }).filter((repository_root) =>
    repository_root.children.length || repository_root.readme_document_id,
  );
  if (service_roots.length) {
    const servers_folder = {
      key: `${main_root.key}/servers`,
      title: "servers",
      isLeaf: false,
      children: [],
      repository: "fracto",
      folder_path: "servers",
    };
    const existing_servers_folder = main_root.children.find(
      (node) => node.folder_path === "servers",
    );
    const target_servers_folder = existing_servers_folder || servers_folder;
    if (!existing_servers_folder) main_root.children.push(target_servers_folder);
    target_servers_folder.children.push(...service_roots);
  }

  const decorate_empty_folders = (node) => {
    (node.children || []).forEach((child) => {
      if (!child.document_id) decorate_empty_folders(child);
    });
    const has_markdown = Boolean(node.readme_document_id) ||
      (node.children || []).some((child) => Boolean(child.document_id));
    if (!has_markdown) {
      node.label_color = "maroon";
    }
    return has_markdown;
  };
  decorate_empty_folders(main_root);

  const tree = main_root.children.length || main_root.readme_document_id
    ? [main_root]
    : [];
  return { documents, tree };
};
