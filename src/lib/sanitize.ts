import DOMPurify from "isomorphic-dompurify";

/**
 * Clean stored rich text before it is persisted.
 *
 * Blog posts and generated artifacts are stored as HTML and rendered with
 * dangerouslySetInnerHTML — in the library, the chat artifact card, the blog
 * editor and the review preview. Any EDITOR can write that HTML, and admins read
 * it, so unsanitised markup is script running in a reviewer's session on our own
 * origin. Sanitising on write keeps a single choke point; the values already in
 * the database are cleaned on their next save.
 *
 * The allowlist is deliberately close to what the `prose` styles actually render:
 * formatted copy, headings, lists, tables, links and images. No script, no style,
 * no iframes, no event handlers.
 */
const ALLOWED_TAGS = [
  "p", "br", "hr", "div", "span",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "sub", "sup", "mark", "small",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
];

const ALLOWED_ATTR = ["href", "title", "alt", "src", "width", "height", "colspan", "rowspan", "class"];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // javascript: and data: URIs are the ways a bare href/src still executes.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "svg", "math"],
    FORBID_ATTR: ["style", "srcset", "formaction", "xlink:href"],
    ALLOW_DATA_ATTR: false,
  });
}
