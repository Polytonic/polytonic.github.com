import m from "mithril"

interface DateDisplayAttrs {
    datetime: string
}

// Formatter pinned to the site's canonical timezone (America/New_York) so
// viewers in different zones see the same day the build computed into the URL.
// Format mirrors the original site: "DD MMMM YYYY" (e.g. "09 January 2016").
const FORMATTER = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    day: "2-digit",
    month: "long",
    year: "numeric",
})

export const DateDisplay: m.Component<DateDisplayAttrs> = {
    view(vnode) {
        const parts = FORMATTER.formatToParts(new Date(vnode.attrs.datetime))
        const day = parts.find(p => p.type === "day")!.value
        const month = parts.find(p => p.type === "month")!.value
        const year = parts.find(p => p.type === "year")!.value
        return m("time", { datetime: vnode.attrs.datetime }, `${day} ${month} ${year}`)
    },
}
