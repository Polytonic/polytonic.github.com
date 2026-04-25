import m from "mithril"
import { SiteHeader } from "./site-header"
import { SiteFooter } from "./site-footer"
import { Hamburger } from "./hamburger"
import { latestPostUrl } from "../content/queries"
import * as styles from "../../styles/components/layout.module.css"

// Default page layout: header, content, footer, hamburger overlay.
// HomeView bypasses Layout because its hero replaces the navbar; if you add
// another bypass route, mirror SiteFooter and Hamburger as siblings of <main>
// per the landmark structure here.
export const Layout: m.Component = {
    view(vnode) {
        return m("div", { class: styles.layout }, [
            // Skip link for keyboard users. .visually-hidden hides it until
            // it receives focus; the focus ring CSS makes it appear at the
            // top-left.
            m("a", { href: "#main-content", class: "skip-link" }, "Skip to main content"),
            m(SiteHeader),
            m("main", { class: styles.main, id: "main-content", tabindex: "-1" }, vnode.children),
            m(SiteFooter, { latestUrl: latestPostUrl() }),
            m(Hamburger),
        ])
    },
}
