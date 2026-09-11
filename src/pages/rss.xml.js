import rss from "@astrojs/rss";

const posts = [
  { slug: "ai-use-during-learning", title: "Should You Use AI While Learning to Code? A Practical Guide", pubDate: new Date("2026-03-01"), description: "When AI helps you learn and when it replaces the learning." },
  { slug: "what-college-misses-in-developer-education", title: "What College Doesn't Teach About Software Engineering", pubDate: new Date("2026-03-01"), description: "The team skills a CS degree leaves out." },
  { slug: "first-code-review-guide", title: "How to Prepare for Your First Code Review", pubDate: new Date("2026-03-01"), description: "What reviewers look for and how to respond." },
];

export function GET(context) {
  return rss({
    title: "DEVS blog",
    description: "Practical writing on becoming team-ready as a developer.",
    site: context.site,
    items: posts.map((p) => ({ ...p, link: `/blog/${p.slug}/` })),
  });
}
