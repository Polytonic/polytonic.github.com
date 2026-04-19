import m from "mithril"

interface DateDisplayAttrs {
    datetime: string
}

// Renders a <time> element with "DD MMMM YYYY" format matching original site
export const DateDisplay: m.Component<DateDisplayAttrs> = {
    view(vnode) {
        const date = new Date(vnode.attrs.datetime)
        const day = String(date.getDate()).padStart(2, "0")
        const month = date.toLocaleDateString("en-US", { month: "long" })
        const year = date.getFullYear()
        return m("time", { datetime: vnode.attrs.datetime }, `${day} ${month} ${year}`)
    },
}
