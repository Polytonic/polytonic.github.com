import m from "mithril"
import { portfolio } from "../../content/portfolio"
import { Layout } from "../../components/layout"
import { ProjectCard } from "./project-card"
import * as styles from "../../../styles/views/portfolio/portfolio-view.module.css"

export const PortfolioView: m.Component = {
    view() {
        return m(Layout, [

            // Professional section
            m("div", { class: styles.tableOfContents }, [
                m("section", { class: styles.professional }, [
                    m("h1", { class: styles.pageTitle }, "Professional Work"),
                    m("p", "I am currently a software development engineer with ", m("a", { href: "https://games.amazon.com/", target: "_blank", rel: "noopener noreferrer" }, "Amazon Game Studios"), ". When I'm not performing mad science experiments, I write gameplay, systems, and UI/UX code."),
                    m("p", "Previously, I was a software development engineer intern inside ", m("a", { href: "https://aws.amazon.com/", target: "_blank", rel: "noopener noreferrer" }, "Amazon Web Services"), ". I was exposed to a variety of image processing and video encoding domain topics while working on real-time streaming backends. Before that, I was a summer student at the ", m("a", { href: "https://www.nrl.navy.mil/", target: "_blank", rel: "noopener noreferrer" }, "United States Naval Research Laboratory"), ". I performed research on experimental and theoretical projects in fields of study including: underwater electrical discharges, target tracking, and parallel computing."),
                    m("p", [
                        "For more details, check out my ",
                        m("a", { href: "/portfolio/documents/resume.pdf" }, "r\u00E9sum\u00E9"),
                        ".",
                    ]),
                ]),

                m("section", { class: styles.undergraduate }, [
                    m("h2", { class: styles.sectionTitle }, "Undergraduate Portfolio"),
                    m("p", [
                        "I completed the following projects as a student in the ",
                        m("a", { href: "https://www.hass.rpi.edu/pl/gaming/", target: "_blank", rel: "noopener noreferrer" }, "Games and Simulation Arts and Sciences"),
                        " program at ",
                        m("a", { href: "https://rpi.edu/", target: "_blank", rel: "noopener noreferrer" }, "Rensselaer Polytechnic Institute"),
                        ". I've collaborated with many people; you should check out their portfolios too!",
                    ]),

                    // Table of contents
                    m("nav", { class: styles.toc },
                        m("ul",
                            portfolio.map(item =>
                                m("li", { key: item.slug },
                                    m("a", { href: `#${item.slug}` }, item.title),
                                ),
                            ),
                        ),
                    ),
                ]),
            ]),

            // Portfolio card grid: dark background wrapper
            m("div", { class: styles.gridWrapper }, [
                m("div", { class: styles.grid },
                    portfolio.map(item =>
                        m(ProjectCard, { key: item.slug, item }),
                    ),
                ),
            ]),
        ])
    },
}
