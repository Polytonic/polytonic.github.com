import m from "mithril"
import { SiteHeader } from "./site-header"
import { SiteFooter } from "./site-footer"
import { Hamburger } from "./hamburger"
import * as styles from "../../styles/components/layout.module.css"

// Default page layout: header, content, footer, hamburger overlay
export const Layout: m.Component = {
    view(vnode) {
        return m("div", { class: styles.layout }, [
            m(SiteHeader),
            m("main", { class: styles.main }, vnode.children),
            m(SiteFooter),
            m(Hamburger),
        ])
    },
}
