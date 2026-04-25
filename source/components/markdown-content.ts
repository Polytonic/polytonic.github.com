import m from "mithril"
import { rewriteMarkdownPaths } from "../with-base"

interface MarkdownContentAttrs {
    body: string
}

// Renders pre-processed markdown body as raw HTML.
// Content is author-controlled, so m.trust() is safe here.
// rewriteMarkdownPaths prepends the deploy prefix to root-absolute src/href
// values that build-content emitted without knowing the deploy URL.
export const MarkdownContent: m.Component<MarkdownContentAttrs> = {
    view(vnode) {
        return m("div", { class: "markdown-body" }, m.trust(rewriteMarkdownPaths(vnode.attrs.body)))
    },
}
