// Deploy-base helpers. The <meta name="app-base"> in index.html stays "/"
// because this is the polytonic.github.io GitHub Pages user site, served from
// the domain root with www.tinycranes.com as its custom domain. Components use
// withBase() when constructing root-absolute internal paths so runtime paths
// follow the configured app base. rewriteMarkdownPaths() does the same for
// author-rendered HTML strings, where path construction has already happened
// at build time.
//
// The pure helpers (buildPrefix, joinBase, trimBase, rewritePathsIn) take
// the prefix as a parameter so tests can exercise them without a DOM. The
// module-level exports below bind them to APP_BASE_PREFIX read from the
// page's <meta> tag at load time.

// Pure helpers should stay DOM-free so tests can import them safely.

export function buildPrefix(base: string): string {
    return base === "/" ? "" : base.slice(0, -1)
}

export function joinBase(prefix: string, path: string): string {
    if (!prefix) return path
    if (!path.startsWith("/")) return path
    if (path.startsWith("//")) return path
    return prefix + path
}

export function trimBase(prefix: string, pathname: string): string {
    if (prefix && pathname.startsWith(prefix)) {
        return pathname.slice(prefix.length) || "/"
    }
    return pathname
}

export function rewritePathsIn(prefix: string, html: string): string {
    if (!prefix) return html
    return prefixAttribute(prefix, prefixAttribute(prefix, html, "src"), "href")
}

function prefixAttribute(prefix: string, html: string, attribute: string): string {
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
            out += `${attribute}="${prefix}/`
        }
        cursor = hit + target.length
    }
}

// Module-level bindings for the running app. Guarded so the module loads in
// non-DOM environments (Bun test runner) without crashing.

export const APP_BASE: string = typeof document === "undefined"
    ? "/"
    : document.querySelector("meta[name=app-base]")?.getAttribute("content") || "/"

export const APP_BASE_PREFIX: string = buildPrefix(APP_BASE)

export function withBase(path: string): string {
    return joinBase(APP_BASE_PREFIX, path)
}

export function stripBase(pathname: string): string {
    return trimBase(APP_BASE_PREFIX, pathname)
}

export function rewriteMarkdownPaths(html: string): string {
    return rewritePathsIn(APP_BASE_PREFIX, html)
}
