import m from "mithril"
import { posts } from "../content/posts"
import { SiteHeader } from "./site-header"
import { SiteFooter } from "./site-footer"
import { Hamburger } from "./hamburger"
import * as styles from "../../styles/components/layout.module.css"

function latestPostUrl(): string {
    const latest = posts[0]
    return latest ? `/blog/${latest.year}/${latest.month}/${latest.slug}` : "/blog"
}

// Default page layout: header, content, footer, hamburger overlay
export const Layout: m.Component = {
    view(vnode) {
        return m("div", { class: styles.layout }, [
            m(SiteHeader),
            m("main", { class: styles.main }, vnode.children),
            m(SiteFooter, { latestUrl: latestPostUrl() }),
            m(Hamburger),
        ])
    },
}
