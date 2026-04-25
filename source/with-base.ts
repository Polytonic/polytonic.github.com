// Deploy-base helpers. The <meta name="app-base"> in index.html starts as
// "/" and the GitHub Pages workflow rewrites it to "/<repo>/" for project-
// page (subpath) deploys. Components use withBase() when constructing root-
// absolute internal paths so a single build serves both root and subpath
// targets cleanly. rewriteMarkdownPaths() does the same for author-rendered
// HTML strings, where path construction has already happened at build time.

export const APP_BASE: string =
    document.querySelector("meta[name=app-base]")?.getAttribute("content") || "/"

export const APP_BASE_PREFIX: string =
    APP_BASE === "/" ? "" : APP_BASE.slice(0, -1)

// Prepend the deploy prefix to a root-absolute internal path. External URLs
// and protocol-relative URLs pass through untouched.
export function withBase(path: string): string {
    if (!APP_BASE_PREFIX) return path
    if (!path.startsWith("/")) return path
    if (path.startsWith("//")) return path
    return APP_BASE_PREFIX + path
}

// Strip the deploy prefix from a pathname so internal route checks see the
// logical app path (e.g. "/blog/post/") regardless of subpath deployment.
export function stripBase(pathname: string): string {
    if (APP_BASE_PREFIX && pathname.startsWith(APP_BASE_PREFIX)) {
        return pathname.slice(APP_BASE_PREFIX.length) || "/"
    }
    return pathname
}

// Rewrite root-absolute src= and href= attribute values inside an HTML
// string so author-rendered markdown picks up the deploy prefix at runtime.
// Build-time HTML compilation in scripts/build-content.ts emits absolute
// "/uploads/..." paths because it doesn't know the deploy URL; this
// rewrites them on render. Skips protocol-relative URLs ("//host/...").
export function rewriteMarkdownPaths(html: string): string {
    if (!APP_BASE_PREFIX) return html
    return prefixAttribute(prefixAttribute(html, "src"), "href")
}

function prefixAttribute(html: string, attribute: string): string {
    const target = `${attribute}="/`
    let out = ""
    let cursor = 0
    while (true) {
        const hit = html.indexOf(target, cursor)
        if (hit === -1) return out + html.slice(cursor)
        out += html.slice(cursor, hit)
        const next = html.charAt(hit + target.length)
        if (next === "/") {
            out += target
        } else {
            out += `${attribute}="${APP_BASE_PREFIX}/`
        }
        cursor = hit + target.length
    }
}
