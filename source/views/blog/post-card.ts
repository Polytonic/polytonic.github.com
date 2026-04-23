import m from "mithril"
import type { Post } from "../../content/types"
import { DateDisplay } from "../../components/date-display"
import { MarkdownContent } from "../../components/markdown-content"
import * as styles from "../../../styles/views/blog/post-card.module.css"

interface PostCardAttrs {
    post: Post
    expanded: boolean
}

// Renders a blog post as either a preview card or full article
export const PostCard: m.Component<PostCardAttrs> = {
    view(vnode) {
        const { post, expanded } = vnode.attrs
        const postUrl = `/blog/${post.year}/${post.month}/${post.slug}/`

        return m("article", { class: styles.article }, [
            m("header", { class: styles.header }, [
                expanded
                    ? m("h2", { class: styles.title }, post.title)
                    : m("h2", { class: styles.title },
                        m(m.route.Link, { href: postUrl }, post.title),
                    ),
                m("div", { class: styles.meta },
                    m(DateDisplay, { datetime: post.datetime }),
                ),
            ]),

            post.image
                ? m("img", { class: styles.splash, src: post.image, alt: post.title })
                : null,

            expanded
                ? m(MarkdownContent, { body: post.body })
                : post.preview
                    ? m("div", { class: styles.preview }, [
                        m(MarkdownContent, { body: post.preview }),
                        m(m.route.Link, { href: postUrl, class: styles.readMore }, "Read More ..."),
                    ])
                    : m(MarkdownContent, { body: post.body }),
        ])
    },
}
