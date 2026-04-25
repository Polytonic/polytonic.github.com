import m from "mithril"
import * as styles from "../../styles/components/hamburger.module.css"

const MENU_LINKS = [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog/" },
    { label: "Portfolio", href: "/portfolio/" },
    { label: "Back to Top", href: "#top" },
]

const MENU_ID = "hamburger-menu"

// Hamburger navigation: fixed button that appears on scroll, with slide-in menu.
// Closure component so state is per-instance; a second mount (e.g. on the home
// page, which doesn't go through Layout) gets independent state.
export const Hamburger: m.ClosureComponent = () => {
    let expanded = false
    let fixed = false
    let buttonEl: HTMLElement | null = null

    function checkScroll(): void {
        const navbar = document.querySelector("[data-navbar]")
        const offset = navbar ? navbar.clientHeight * 1.25 : window.innerHeight - 10
        const scrolled = window.scrollY > offset

        if (scrolled && !fixed) {
            fixed = true
            m.redraw()
        } else if (!scrolled && fixed) {
            // When scrolling back to the top the button hides, so the menu
            // must close too or it would orphan off-screen.
            expanded = false
            fixed = false
            m.redraw()
        }
    }

    function onKeydown(event: KeyboardEvent): void {
        if (!expanded) return

        if (event.key === "Escape") {
            expanded = false
            // Flush the DOM update before moving focus so the button's
            // aria-expanded="false" / aria-label="Open menu" are current
            // when screen readers announce the focus landing.
            m.redraw.sync()
            buttonEl?.focus()
            return
        }

        // Cycle Tab within the open disclosure (button + menu links). Keeps
        // keyboard focus visible within the overlay rather than escaping into
        // the obscured page content.
        if (event.key === "Tab") {
            const menuEl = document.getElementById(MENU_ID)
            if (!menuEl || !buttonEl) return
            const focusables: HTMLElement[] = [
                buttonEl,
                ...menuEl.querySelectorAll<HTMLElement>("a"),
            ]
            const active = document.activeElement
            const index = active instanceof HTMLElement ? focusables.indexOf(active) : -1
            // Focus drifted outside the overlay (click on the unobscured page,
            // devtools, extensions). Pull it back to the button so Tab can't
            // walk into page content that's visually hidden under the overlay.
            if (index === -1) {
                event.preventDefault()
                buttonEl.focus()
                return
            }
            if (event.shiftKey && index === 0) {
                event.preventDefault()
                focusables[focusables.length - 1]?.focus()
            } else if (!event.shiftKey && index === focusables.length - 1) {
                event.preventDefault()
                focusables[0]?.focus()
            }
        }
    }

    return {
        oncreate() {
            // Sync initial state in case of direct load on a deep-scroll URL.
            checkScroll()
            window.addEventListener("scroll", checkScroll, { passive: true })
            window.addEventListener("resize", checkScroll, { passive: true })
            window.addEventListener("keydown", onKeydown)
        },

        onremove() {
            window.removeEventListener("scroll", checkScroll)
            window.removeEventListener("resize", checkScroll)
            window.removeEventListener("keydown", onKeydown)
        },

        view() {
            const containerClass = [styles.container, fixed ? styles.fixed : ""].filter(Boolean).join(" ")
            const buttonClass = [styles.button, expanded ? styles.buttonExpanded : ""].filter(Boolean).join(" ")
            const menuClass = [styles.menu, expanded ? styles.menuVisible : ""].filter(Boolean).join(" ")

            return m("nav", { class: containerClass }, [
                m("button", {
                    type: "button",
                    class: buttonClass,
                    "aria-expanded": String(expanded),
                    "aria-controls": MENU_ID,
                    "aria-label": expanded ? "Close menu" : "Open menu",
                    oncreate(vnode: m.VnodeDOM) { buttonEl = vnode.dom as HTMLElement },
                    onremove() { buttonEl = null },
                    onclick() { expanded = !expanded },
                }, m("span")),

                m("ul", {
                    id: MENU_ID,
                    class: menuClass,
                    // aria-hidden + inert keep the menu out of the tab order
                    // and the a11y tree whenever it's not fully open. The
                    // visibility transition lasts 400ms, and during that
                    // window the links are still DOM-focusable without this.
                    "aria-hidden": expanded ? undefined : "true",
                    inert: expanded ? undefined : true,
                },
                    MENU_LINKS.map((link, index) =>
                        m("li", {
                            key: link.label,
                            style: expanded ? `animation-delay: ${index * 0.1}s` : undefined,
                        },
                            link.href.startsWith("#")
                                ? m("a", {
                                    href: link.href,
                                    onclick(event: MouseEvent) {
                                        event.preventDefault()
                                        expanded = false
                                        window.scrollTo({ top: 0, behavior: "smooth" })
                                    },
                                }, link.label)
                                : m(m.route.Link, {
                                    href: link.href,
                                    onclick() { expanded = false },
                                }, link.label),
                        ),
                    ),
                ),
            ])
        },
    }
}
