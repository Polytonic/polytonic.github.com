import m from "mithril"
import { posts } from "../../content/posts"
import { SiteFooter } from "../../components/site-footer"
import { Hamburger } from "../../components/hamburger"
import * as styles from "../../../styles/views/home/home-view.module.css"

const SOCIAL_LINKS = [
    { label: "GitHub", href: "https://github.com/Polytonic/" },
    { label: "LinkedIn", href: "https://linkedin.com/in/tinycranes/" },
    { label: "Email", href: "mailto:mail@tinycranes.com" },
]

function latestPostUrl(): string {
    const latest = posts[0]
    return latest ? `/blog/${latest.year}/${latest.month}/${latest.slug}` : "/blog"
}

// Homepage has no navbar header, just a full-viewport hero and about section
export const HomeView: m.Component = {
    view() {
        return m("div", { class: styles.home }, [

            // Full-viewport hero with centered greeting
            m("header", { class: styles.masthead }, [
                m("h1", { class: styles.heroTitle }, [
                    "Hi, I'm Kevin.",
                    m("span", { class: styles.spacer }, m("br")),
                    " I build things!",
                ]),
                m("nav", { class: styles.heroNav }, [
                    m("a", { href: "#about", class: "cutout" }, "About"),
                    m(m.route.Link, { href: "/blog", class: "cutout" }, "Blog"),
                    m(m.route.Link, { href: "/portfolio", class: "cutout" }, "Work"),
                ]),
            ]),

            // About section with dark background
            m("section", { class: styles.about, id: "about" }, [
                m("div", { class: styles.contents }, [
                    m("img", {
                        class: styles.avatar,
                        src: "/avatar.jpg",
                        alt: "Kevin Fung",
                    }),
                    m("h2", { class: styles.aboutTitle }, "About Myself"),
                    m("p", "Building things is a bit of an obsession for me. Give me an hour and some plastic bricks, and you'll have a ship, a plane, or something else; who knows! I've worked at almost every level of abstraction, from optimizing matrix operations in assembly to systems and network programming using C and Python. I develop games in C++ and C\u266F, and have contributed to web services written in JavaScript and CoffeeScript."),
                    m("p", "I ask useful questions to deliver results, and I seek out help when I'm stumped. I'm always looking to learn new things, because software engineering isn't just some replaceable cog in the machine to me. It's an art ..."),
                    m("p", "Want to work with me? I'd love to chat!"),
                    m("aside", { class: styles.socialNav },
                        SOCIAL_LINKS.map(link =>
                            m("a", {
                                href: link.href,
                                target: "_blank",
                                rel: "noopener noreferrer",
                                class: "cutout",
                            }, link.label),
                        ),
                    ),
                ]),
            ]),

            m(SiteFooter, { latestUrl: latestPostUrl() }),
            m(Hamburger),
        ])
    },
}
