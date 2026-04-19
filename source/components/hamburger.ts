import m from "mithril"
import * as styles from "../../styles/components/hamburger.module.css"

const MENU_LINKS = [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog" },
    { label: "Portfolio", href: "/portfolio" },
    { label: "Back to Top", href: "#top" },
]

interface HamburgerState {
    expanded: boolean
    fixed: boolean
}

const state: HamburgerState = {
    expanded: false,
    fixed: false,
}

function checkScroll(): void {
    // Show hamburger button after scrolling past the navbar
    const navbar = document.querySelector("[data-navbar]")
    const offset = navbar ? navbar.clientHeight * 1.25 : window.innerHeight - 10
    const scrolled = window.scrollY > offset

    if (scrolled && !state.fixed) {
        state.fixed = true
        m.redraw()
    } else if (!scrolled && state.fixed) {
        state.expanded = false
        state.fixed = false
        m.redraw()
    }
}

// Hamburger navigation: fixed button that appears on scroll, with slide-in menu
export const Hamburger: m.Component = {
    oncreate() {
        window.addEventListener("scroll", checkScroll, { passive: true })
        window.addEventListener("resize", checkScroll, { passive: true })
    },

    onremove() {
        window.removeEventListener("scroll", checkScroll)
        window.removeEventListener("resize", checkScroll)
    },

    view() {
        const containerClass = [
            styles.container,
            state.fixed ? styles.fixed : "",
        ].join(" ")

        const buttonClass = [
            styles.button,
            state.expanded ? styles.buttonExpanded : "",
        ].join(" ")

        const menuClass = [
            styles.menu,
            state.expanded ? styles.menuVisible : "",
        ].join(" ")

        return m("nav", { class: containerClass }, [
            m("a", {
                class: buttonClass,
                onclick(event: Event) {
                    event.preventDefault()
                    state.expanded = !state.expanded
                },
            }, m("span")),

            m("ul", { class: menuClass },
                MENU_LINKS.map((link, index) =>
                    m("li", {
                        key: link.label,
                        style: state.expanded
                            ? `animation-delay: ${index * 0.1}s`
                            : undefined,
                    },
                        link.href.startsWith("#")
                            ? m("a", {
                                href: link.href,
                                onclick() {
                                    state.expanded = false
                                    window.scrollTo({ top: 0, behavior: "smooth" })
                                },
                            }, link.label)
                            : m(m.route.Link, {
                                href: link.href,
                                onclick() { state.expanded = false },
                            }, link.label),
                    ),
                ),
            ),
        ])
    },
}
