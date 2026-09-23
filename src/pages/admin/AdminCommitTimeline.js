/**
 * Merge commit rows and normalized tag events into one descending timeline.
 * Tag events are intentionally separate from commit decorations so a tag
 * created in several repositories is rendered only once.
 *
 * @param {Object} options timeline inputs
 * @param {Array<Object>} options.commits visible commit records
 * @param {Array<Object>} options.tag_events normalized tag events
 * @param {Object} options.repository_visibility repository filter state
 * @param {Function} options.create_commit_row converts a commit to a table row
 * @returns {Array<Object>} commit rows and tag-event marker rows
 */
export const merge_commit_timeline = ({
  commits = [],
  tag_events = [],
  repository_visibility = {},
  create_commit_row = (commit) => commit,
}) => {
  const commit_rows = commits.map((commit, index) => ({
    date: commit.date,
    kind: "commit",
    index,
    row: create_commit_row(commit),
  }));
  const tag_rows = tag_events
    .filter((event) =>
      (event.repositories || []).some(
        (repository) => repository_visibility[repository] !== false,
      ),
    )
    .map((event, index) => ({
      date: event.created_at,
      kind: "tag",
      index,
      row: { row_type: "tag_event", tag_event: event },
    }));
  return [...commit_rows, ...tag_rows]
    .sort((left, right) => {
      const date_difference =
        new Date(right.date || 0) - new Date(left.date || 0);
      if (date_difference) return date_difference;
      if (left.kind !== right.kind) return left.kind === "commit" ? -1 : 1;
      return left.index - right.index;
    })
    .map(({ row }) => row);
};
