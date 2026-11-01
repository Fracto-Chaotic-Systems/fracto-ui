import PropTypes from "prop-types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import MarkdownStyles from "./styles/MarkdownStyles.jsx";

const styled_components = {
  h1: MarkdownStyles.Heading1,
  h2: MarkdownStyles.Heading2,
  h3: MarkdownStyles.Heading3,
  p: MarkdownStyles.Paragraph,
  ul: MarkdownStyles.UnorderedList,
  ol: MarkdownStyles.OrderedList,
  li: MarkdownStyles.ListItem,
  blockquote: MarkdownStyles.Blockquote,
  a: MarkdownStyles.Link,
  code: MarkdownStyles.InlineCode,
  pre: MarkdownStyles.CodeBlock,
  table: MarkdownStyles.Table,
  thead: MarkdownStyles.TableHead,
  th: MarkdownStyles.TableHeader,
  tr: MarkdownStyles.TableRow,
  td: MarkdownStyles.TableCell,
  hr: MarkdownStyles.HorizontalRule,
};

// Parser AST nodes belong to renderers, never to DOM attributes.
const default_components = Object.fromEntries(
  Object.entries(styled_components).map(([tag, Component]) => [
    tag,
    function MarkdownElement(props) {
      const dom_props = { ...props };
      delete dom_props.node;
      return <Component {...dom_props} />;
    },
  ]),
);

const ExternalLink = ({ children, href, title }) => (
  <MarkdownStyles.Link
    href={href}
    title={title}
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
  </MarkdownStyles.Link>
);
ExternalLink.propTypes = {
  children: PropTypes.node,
  href: PropTypes.string,
  title: PropTypes.string,
};

// One parsing/presentation pipeline; callers own layout and specific interactions.
const MarkdownDocument = ({
  children,
  components,
  allow_html = false,
  external_links = false,
  remark_plugins = [],
  document_component: Document = MarkdownStyles.Document,
  ...document_props
}) => (
  <Document {...document_props}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm, ...remark_plugins]}
      rehypePlugins={allow_html ? [rehypeRaw] : []}
      skipHtml={!allow_html}
      components={{
        ...default_components,
        ...(external_links ? { a: ExternalLink } : {}),
        ...components,
      }}
    >
      {children}
    </ReactMarkdown>
  </Document>
);
MarkdownDocument.propTypes = {
  children: PropTypes.string.isRequired,
  components: PropTypes.object,
  remark_plugins: PropTypes.array,
  allow_html: PropTypes.bool,
  external_links: PropTypes.bool,
  document_component: PropTypes.elementType,
};
export default MarkdownDocument;
