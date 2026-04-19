import m from "mithril"
import { Layout } from "../components/layout"

export const NotFoundView: m.Component = {
    view() {
        return m(Layout,
            m("div", { class: "content-width" }, [
                m("h1", "Page not found"),
                m("p", [
                    "The page you're looking for doesn't exist. ",
                    m(m.route.Link, { href: "/" }, "Head back home"),
                    ".",
                ]),
            ]),
        )
    },
}
