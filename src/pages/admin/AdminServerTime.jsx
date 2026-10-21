import PropTypes from "prop-types";
import ReactTimeAgo from "react-time-ago";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import MarkdownStyles from "../../utils/ui/styles/MarkdownStyles.jsx";

TimeAgo.locale(en);

/** Timestamp markers from the template are displayed as live relative times. */
export default function AdminServerTime({ href, children }) {
  if (href?.startsWith("#server-time/")) {
    const date = new Date(href.slice("#server-time/".length));
    if (Number.isFinite(date.getTime())) {
      return (
        <span title={date.toLocaleString()}>
          <ReactTimeAgo date={date} tooltip={false} />
        </span>
      );
    }
  }
  return <MarkdownStyles.Link href={href}>{children}</MarkdownStyles.Link>;
}
AdminServerTime.propTypes = {
  href: PropTypes.string,
  children: PropTypes.node,
};
