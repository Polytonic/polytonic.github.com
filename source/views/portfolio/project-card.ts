import m from "mithril"
import type { PortfolioItem } from "../../content/types"
import { MarkdownContent } from "../../components/markdown-content"
import * as styles from "../../../styles/views/portfolio/project-card.module.css"

interface ProjectCardAttrs {
    item: PortfolioItem
}

// Games that used Unity Web Player (deprecated plugin format)
const DEPRECATED_GAMES = new Set(["winter", "overburdened", "hunt-and-peck"])

export const ProjectCard: m.Component<ProjectCardAttrs> = {
    view(vnode) {
        const { item } = vnode.attrs
        const isDeprecated = DEPRECATED_GAMES.has(item.slug)

        return m("div", { class: styles.card, id: item.slug }, [
            // Decorative thumbnail; title heading is the authoritative label.
            item.image
                ? m("img", {
                    class: styles.image,
                    src: `/portfolio/assets/${item.image}`,
                    alt: "",
                    loading: "lazy",
                })
                : null,

            m("div", { class: styles.content }, [
                m("h2", { class: styles.title }, item.title),
                m("h3", { class: styles.subtitle }, item.subtitle),

                Object.keys(item.links).length > 0
                    ? m("nav", { class: styles.links },
                        Object.entries(item.links).map(([label, url]) => {
                            if (label === "Play" && isDeprecated) {
                                const reason = "This game used the Unity Web Player plugin, which is no longer supported by modern browsers."
                                return m("span", {
                                    key: label,
                                    class: ["cutout", styles.disabled].join(" "),
                                    role: "button",
                                    "aria-disabled": "true",
                                    tabindex: "0",
                                    "aria-label": `${label} unavailable: ${reason}`,
                                    title: reason,
                                    onkeydown(event: KeyboardEvent) {
                                        // Space on a focused role=button span defaults to page scroll.
                                        // aria-disabled means no activation, so swallow the key.
                                        if (event.key === " ") event.preventDefault()
                                    },
                                }, label)
                            }
                            return m("a", {
                                key: label,
                                href: url,
                                target: url.startsWith("http") ? "_blank" : undefined,
                                rel: url.startsWith("http") ? "noopener noreferrer" : undefined,
                                class: "cutout",
                            }, label)
                        }),
                    )
                    : null,

                m(MarkdownContent, { body: item.body }),
            ]),
        ])
    },
}
