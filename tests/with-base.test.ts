import { describe, expect, test } from "bun:test"
import { buildPrefix, joinBase, trimBase, rewritePathsIn } from "../source/with-base"

// buildPrefix collapses the meta value "/" to an empty string and strips a
// single trailing slash off subpath bases.
describe("buildPrefix", () => {
    test("root deploy → empty prefix", () => {
        expect(buildPrefix("/")).toBe("")
    })

    test("subpath deploy → strips trailing slash", () => {
        expect(buildPrefix("/TinyCranes/")).toBe("/TinyCranes")
    })

    test("nested subpath", () => {
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
        expect(joinBase("/TinyCranes", "/avatar.jpg")).toBe("/TinyCranes/avatar.jpg")
        expect(joinBase("/TinyCranes", "/blog/post/")).toBe("/TinyCranes/blog/post/")
    })

    test("relative path is untouched", () => {
        expect(joinBase("/TinyCranes", "blog/post/")).toBe("blog/post/")
        expect(joinBase("/TinyCranes", "")).toBe("")
    })

    test("protocol-relative URL is untouched", () => {
        expect(joinBase("/TinyCranes", "//cdn.example.com/script.js")).toBe("//cdn.example.com/script.js")
    })

    test("absolute http(s) URL contains no leading slash so passes through", () => {
        expect(joinBase("/TinyCranes", "https://example.com/x")).toBe("https://example.com/x")
    })
})

// trimBase strips the prefix from a pathname. The router uses this to map
// a subpath URL like "/TinyCranes/blog/" back to the logical "/blog/" route.
describe("trimBase", () => {
    test("empty prefix returns the input unchanged", () => {
        expect(trimBase("", "/blog/")).toBe("/blog/")
    })

    test("matching prefix is sliced off", () => {
        expect(trimBase("/TinyCranes", "/TinyCranes/blog/post/")).toBe("/blog/post/")
    })

    test("prefix with no remaining path returns root", () => {
        expect(trimBase("/TinyCranes", "/TinyCranes/")).toBe("/")
        expect(trimBase("/TinyCranes", "/TinyCranes")).toBe("/")
    })

    test("non-prefixed path passes through", () => {
        expect(trimBase("/TinyCranes", "/blog/")).toBe("/blog/")
    })
})

// rewritePathsIn prefixes root-absolute src and href values inside an HTML
// string. Markdown content compiled at build time emits "/uploads/..." paths
// without knowledge of the deploy URL; this fixes them at render time.
describe("rewritePathsIn", () => {
    test("empty prefix is a no-op", () => {
        const html = `<img src="/uploads/foo.png"><a href="/blog/">Blog</a>`
        expect(rewritePathsIn("", html)).toBe(html)
    })

    test("rewrites src and href", () => {
        const html = `<img src="/uploads/foo.png"><a href="/blog/">Blog</a>`
        const expected = `<img src="/TinyCranes/uploads/foo.png"><a href="/TinyCranes/blog/">Blog</a>`
        expect(rewritePathsIn("/TinyCranes", html)).toBe(expected)
    })

    test("leaves protocol-relative URLs alone", () => {
        const html = `<img src="//cdn.example.com/img.png">`
        expect(rewritePathsIn("/TinyCranes", html)).toBe(html)
    })

    test("leaves http(s) absolute URLs alone", () => {
        const html = `<a href="https://example.com/x">link</a><img src="https://cdn.example.com/x.png">`
        expect(rewritePathsIn("/TinyCranes", html)).toBe(html)
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
