export interface Post {
    title: string
    slug: string
    datetime: string
    year: string
    month: string
    monthName: string
    day: string
    image: string | null
    description: string
    preview: string | null
    body: string
}

export interface PortfolioItem {
    title: string
    subtitle: string
    slug: string
    image: string | null
    links: Record<string, string>
    body: string
}
