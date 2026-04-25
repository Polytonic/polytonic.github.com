import m from "mithril"
import { posts } from "../../content/posts"
import { Layout } from "../../components/layout"
import { PostCard } from "./post-card"
import { BlogDisclaimer } from "./blog-disclaimer"
import * as styles from "../../../styles/views/blog/blog-list-view.module.css"

interface BlogFilteredRouteAttrs {
    year: string
    month?: string
}

// Blog posts filtered by year and optionally month, matching original routes
export const BlogFilteredView: m.Component<BlogFilteredRouteAttrs> = {
    view(vnode) {
        const { year, month } = vnode.attrs

        const filtered = posts.filter(post => {
            if (post.year !== year) return false
            if (month && post.month !== month) return false
            return true
        })

        const filterLabel = month ? `Posts from ${month}/${year}` : `Posts from ${year}`

        if (filtered.length === 0) {
            return m(Layout,
                m("div", { class: "content-width" }, [
                    m("h1", { class: "visually-hidden" }, filterLabel),
                    m("p", "No posts found."),
                ]),
            )
        }

        return m(Layout, [
            m("div", { class: styles.entry }, [
                m("h1", { class: "visually-hidden" }, filterLabel),
                filtered.map(post =>
                    m(PostCard, { key: post.slug, post, expanded: false }),
                ),
                m(BlogDisclaimer),
            ]),
        ])
    },
}
