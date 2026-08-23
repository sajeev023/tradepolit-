import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";

/**
 * Internal-link integrity test.
 *
 * Scans public marketing pages and shared layout components for internal
 * href literals ("/..." strings) and asserts each resolves to a real route in
 * the App Router tree. This catches the class of bug where a breadcrumb or nav
 * points at a hub route ("/compare", "/guides") that was never created.
 */

const ROOT = join(__dirname, "..", "..");
const SRC_APP = join(ROOT, "src", "app");
const SCAN_DIRS = [
  SRC_APP,
  join(ROOT, "src", "components", "landing"),
  join(ROOT, "src", "components", "layout"),
];

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.tsx$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Every concrete route the App Router can serve (pages + API routes).
 * Auth/dashboard routes ARE real URLs, so links to them must resolve too. */
function collectRoutes(): Set<string> {
  const routes = new Set<string>();
  for (const file of walk(SRC_APP)) {
    if (!/[/\\](page|route)\.(ts|tsx)$/.test(file)) continue;
    const rel = relative(SRC_APP, dirname(file));
    if (rel.startsWith("..")) continue;
    const parts = rel.split(sep).filter((p) => p && p !== ".");
    // Route groups don't contribute URL segments.
    const urlParts = parts.filter((p) => !p.startsWith("("));
    const route =
      urlParts.length === 0 ? "/" : "/" + urlParts.join("/");
    routes.add(route);
  }
  return routes;
}

function collectInternalHrefs(files: string[]): Map<string, string[]> {
  const hrefsByFile = new Map<string, string[]>();
  const patterns = [/href:\s*"([^"]+)"/g, /href=\{?"([^"]+)"/g];
  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const found = new Set<string>();
    for (const re of patterns) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        const href = m[1];
        if (href.startsWith("/")) found.add(href);
      }
    }
    if (found.size > 0) {
      hrefsByFile.set(relative(ROOT, file), [...found].sort());
    }
  }
  return hrefsByFile;
}

describe("Public internal-link integrity", () => {
  const routes = collectRoutes();
  // Scan marketing surfaces only; dashboard/auth internals manage their own links.
  const files = SCAN_DIRS.flatMap((dir) => walk(dir)).filter(
    (f) =>
      !f.includes(`${sep}api${sep}`) &&
      !f.includes(`${sep}(auth)${sep}`) &&
      !f.includes(`${sep}(dashboard)${sep}`)
  );
  const hrefsByFile = collectInternalHrefs(files);

  it("discovers a sane set of public routes (sanity check)", () => {
    expect(routes.has("/")).toBe(true);
    expect(routes.has("/pricing")).toBe(true);
    expect(routes.has("/compare")).toBe(true);
    expect(routes.has("/guides")).toBe(true);
    expect(routes.has("/login")).toBe(true);
  });

  it("scans a meaningful number of files (sanity check)", () => {
    expect(files.length).toBeGreaterThan(15);
  });

  it("resolves every internal href to an existing route", () => {
    const broken: string[] = [];

    for (const [file, hrefs] of hrefsByFile) {
      for (const raw of hrefs) {
        // Pure in-page anchor — element existence is a rendering concern.
        if (raw.startsWith("#")) continue;

        // Strip hash/query for route resolution ("/#how-it-works" -> "/").
        const pathOnly = raw.split("#")[0].split("?")[0];
        if (pathOnly === "" || pathOnly === "/") continue;

        if (!routes.has(pathOnly)) {
          broken.push(`${file} -> ${raw}`);
        }
      }
    }

    expect(
      broken,
      `Broken internal links found:\n${broken.join("\n")}`
    ).toEqual([]);
  });
});
