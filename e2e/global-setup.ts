// Warms the dev server's routes before the suite runs. Next.js dev compiles
// each route on first hit, which otherwise causes an intermittent login bounce
// (the "/" render races the just-set session cookie while compiling).
async function warm(path: string) {
  try {
    await fetch(`http://localhost:3100${path}`, { redirect: "manual" });
  } catch {
    // server not up yet / transient — ignore, tests will still retry
  }
}

export default async function globalSetup() {
  const routes = [
    "/login",
    "/api/auth/csrf",
    "/api/auth/session",
    "/",
    "/blog-posts",
    "/thumbnails",
    "/images",
    "/videos",
    "/members",
    "/trash",
  ];
  // Two passes: the first triggers compilation, the second confirms warmth.
  for (let pass = 0; pass < 2; pass++) {
    for (const r of routes) await warm(r);
  }
}
