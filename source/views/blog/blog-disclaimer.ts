import m from "mithril"
import * as styles from "../../../styles/views/blog/blog-list-view.module.css"

// Standard trailer on every blog view. Originally inlined in three places.
export const BlogDisclaimer: m.Component = {
    view() {
        return m("aside", { class: styles.disclaimer },
            m("sub", "Disclaimer: The views and opinions expressed on this blog are purely my own."),
        )
    },
}
