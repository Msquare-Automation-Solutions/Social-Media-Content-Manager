/**
 * Horizontal scroll container for the workspace-overview org chart. Content
 * centers itself when it fits (via CSS `justify-content: safe center`) and
 * starts from the left when it overflows, so the first platform is never
 * clipped. The user can scroll sideways to see the rest.
 */
export function CenteredScroll({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`overflow-x-auto ${className}`}>{children}</div>;
}
