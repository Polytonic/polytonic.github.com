import m from "mithril"
import { posts } from "../../content/posts"
import { Layout } from "../../components/layout"
import { PostCard } from "./post-card"
import { BlogDisclaimer } from "./blog-disclaimer"
import * as styles from "../../../styles/views/blog/blog-list-view.module.css"

// Groups posts by year for display
function groupByYear(items: typeof posts): Map<string, typeof posts> {
    const groups = new Map<string, typeof posts>()
    for (const post of items) {
        const existing = groups.get(post.year) ?? []
        existing.push(post)
        groups.set(post.year, existing)
    }
    return groups
}

export const BlogListView: m.Component = {
    view() {
        const grouped = groupByYear(posts)
        const years = [...grouped.keys()]

        return m(Layout, [
            m("div", { class: styles.entry }, [
                years.map(year =>
                    m("section", { key: year }, [
                        years.length > 1
                            ? m("h2", { class: styles.yearHeader }, year)
                            : null,
                        (grouped.get(year) ?? []).map(post =>
                            m(PostCard, { key: post.slug, post, expanded: false }),
                        ),
                    ]),
                ),
                m(BlogDisclaimer),
            ]),
        ])
    },
}
