import { posts } from "./posts"

// Canonical URL for the most recent post. Falls back to /blog/ when the
// archive is empty. Used by Layout (footer), HomeView (footer), and the
// /blog/latest redirect.
export function latestPostUrl(): string {
    const latest = posts[0]
    return latest ? `/blog/${latest.year}/${latest.month}/${latest.slug}/` : "/blog/"
}
