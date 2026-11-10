/** Outside links shown in the sidebar footer and on the home page. */
export const LINKS = {
    /** This project's source. */
    repo: "https://github.com/tech-house-blr/ctf-army-knife",
    website: "https://www.techhouseblr.com",
    // Tech House socials, as listed on the Tech House website (app/layout.tsx there).
    socials: [
        { label: "X", handle: "@TechHouseBlr", href: "https://x.com/TechHouseBlr", icon: "x" },
        { label: "Instagram", handle: "@tech.house.blr", href: "https://instagram.com/tech.house.blr", icon: "instagram" },
        { label: "GitHub", handle: "tech-house-blr", href: "https://github.com/tech-house-blr", icon: "github" },
    ],
} as const;
