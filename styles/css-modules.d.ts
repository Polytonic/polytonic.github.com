declare module "*.module.css" {
    const classes: Record<string, string>
    export = classes
}

// Side-effect imports of plain stylesheets (e.g. highlight.js theme).
declare module "*.css"
