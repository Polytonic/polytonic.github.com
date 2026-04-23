import m from "mithril"
import { posts } from "../../content/posts"
import { Layout } from "../../components/layout"
import { PostCard } from "./post-card"
import { BlogDisclaimer } from "./blog-disclaimer"
import * as styles from "../../../styles/views/blog/blog-list-view.module.css"

interface BlogPostRouteAttrs {
    year: string
    month: string
    slug: string
}

// Single blog post view, resolved from route params
export const BlogPostView: m.Component<BlogPostRouteAttrs> = {
    view(vnode) {
        const { year, month, slug } = vnode.attrs
        const post = posts.find(
            entry => entry.year === year && entry.month === month && entry.slug === slug,
        )

        if (!post) {
            return m(Layout,
                m("div", { class: "content-width" },
                    m("p", "Post not found."),
                ),
            )
        }

        return m(Layout, [
            m("div", { class: styles.entry }, [
                m(PostCard, { post, expanded: true }),
                m(BlogDisclaimer),
            ]),
        ])
    },
}
