import { describe, expect, test } from "bun:test"
import { buildPrefix, joinBase, trimBase, rewritePathsIn } from "../source/with-base"

// buildPrefix collapses the meta value "/" to an empty string and strips a
// single trailing slash off non-root bases.
describe("buildPrefix", () => {
    test("root deploy → empty prefix", () => {
        expect(buildPrefix("/")).toBe("")
    })

    test("non-root base strips trailing slash", () => {
        expect(buildPrefix("/site/")).toBe("/site")
    })

    test("nested base", () => {
        expect(buildPrefix("/foo/bar/")).toBe("/foo/bar")
    })
})

// joinBase prepends the prefix only to root-absolute, single-slash internal
// paths. External, protocol-relative, and relative inputs pass through.
describe("joinBase", () => {
    test("empty prefix is a no-op", () => {
        expect(joinBase("", "/avatar.jpg")).toBe("/avatar.jpg")
    })

    test("root-absolute internal path gets prefixed", () => {
        expect(joinBase("/site", "/avatar.jpg")).toBe("/site/avatar.jpg")
        expect(joinBase("/site", "/blog/post/")).toBe("/site/blog/post/")
    })

    test("relative path is untouched", () => {
        expect(joinBase("/site", "blog/post/")).toBe("blog/post/")
        expect(joinBase("/site", "")).toBe("")
    })

    test("protocol-relative URL is untouched", () => {
        expect(joinBase("/site", "//cdn.example.com/script.js")).toBe("//cdn.example.com/script.js")
    })

    test("absolute http(s) URL contains no leading slash so passes through", () => {
        expect(joinBase("/site", "https://example.com/x")).toBe("https://example.com/x")
    })
})

// trimBase strips the prefix from a pathname. The router uses this to map
// a configured base like "/site/blog/" back to the logical "/blog/" route.
describe("trimBase", () => {
    test("empty prefix returns the input unchanged", () => {
        expect(trimBase("", "/blog/")).toBe("/blog/")
    })

    test("matching prefix is sliced off", () => {
        expect(trimBase("/site", "/site/blog/post/")).toBe("/blog/post/")
    })

    test("prefix with no remaining path returns root", () => {
        expect(trimBase("/site", "/site/")).toBe("/")
        expect(trimBase("/site", "/site")).toBe("/")
    })

    test("non-prefixed path passes through", () => {
        expect(trimBase("/site", "/blog/")).toBe("/blog/")
    })
})

// rewritePathsIn prefixes root-absolute src and href values inside an HTML
// string. Markdown content compiled at build time emits "/uploads/..." paths
// without knowledge of the deploy URL. This fixes them at render time.
describe("rewritePathsIn", () => {
    test("empty prefix is a no-op", () => {
        const html = `<img src="/uploads/foo.png"><a href="/blog/">Blog</a>`
        expect(rewritePathsIn("", html)).toBe(html)
    })

    test("rewrites src and href", () => {
        const html = `<img src="/uploads/foo.png"><a href="/blog/">Blog</a>`
        const expected = `<img src="/site/uploads/foo.png"><a href="/site/blog/">Blog</a>`
        expect(rewritePathsIn("/site", html)).toBe(expected)
    })

    test("leaves protocol-relative URLs alone", () => {
        const html = `<img src="//cdn.example.com/img.png">`
        expect(rewritePathsIn("/site", html)).toBe(html)
    })

    test("leaves http(s) absolute URLs alone", () => {
        const html = `<a href="https://example.com/x">link</a><img src="https://cdn.example.com/x.png">`
        expect(rewritePathsIn("/site", html)).toBe(html)
    })

    test("handles multiple replacements in one document", () => {
        const html = `<a href="/a/"><img src="/b.png"></a><a href="/c/">c</a>`
        const expected = `<a href="/p/a/"><img src="/p/b.png"></a><a href="/p/c/">c</a>`
        expect(rewritePathsIn("/p", html)).toBe(expected)
    })

    test("does not match unquoted attribute values", () => {
        // Parcel's HTML minifier strips quotes from short attr values; we only
        // rewrite the quoted form because matching unquoted requires lookahead
        // logic that adds risk for marginal benefit. Author markdown is
        // quoted; this only matters for hand-authored HTML in markdown bodies.
        const html = `<img src=/short>`
        expect(rewritePathsIn("/p", html)).toBe(html)
    })
})
