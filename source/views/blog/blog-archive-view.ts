import m from "mithril"
import { posts } from "../../content/posts"
import { Layout } from "../../components/layout"
import * as styles from "../../../styles/views/blog/blog-archive-view.module.css"

// Collect unique months per year, preserving order
function groupByYearMonth() {
    const groups = new Map<string, Map<string, string>>()
    for (const post of posts) {
        if (!groups.has(post.year)) groups.set(post.year, new Map())
        const yearMap = groups.get(post.year)!
        // Store monthName -> month number mapping (first occurrence wins)
        if (!yearMap.has(post.monthName)) yearMap.set(post.monthName, post.month)
    }
    return groups
}

export const BlogArchiveView: m.Component = {
    view() {
        const grouped = groupByYearMonth()

        return m(Layout, [
            m("div", { class: styles.entry }, [
                m("h1", { class: styles.pageTitle }, "Archive"),
                [...grouped.entries()].map(([year, months]) =>
                    m("section", { key: year, class: styles.archive }, [
                        m("h2", year),
                        [...months.entries()].map(([monthName, monthNumber]) =>
                            m("ul", { key: monthName },
                                m("li",
                                    m(m.route.Link, {
                                        href: `/blog/${year}/${monthNumber}/`,
                                    }, monthName),
                                ),
                            ),
                        ),
                    ]),
                ),
            ]),
        ])
    },
}
