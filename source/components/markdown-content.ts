import m from "mithril"

interface MarkdownContentAttrs {
    body: string
}

// Renders pre-processed markdown body as raw HTML
// Content is author-controlled, so m.trust() is safe here
export const MarkdownContent: m.Component<MarkdownContentAttrs> = {
    view(vnode) {
        return m("div", { class: "markdown-body" }, m.trust(vnode.attrs.body))
    },
}
