# DEVS — Developer, Engineering, and Vibe School

Landing site for [begindevs.com](https://begindevs.com): an online lab to take beginners from zero to developer-team ready. Real tools, version control, agile, AI-inclusive—free for now.

## Stack

- [Astro](https://astro.build) (static)
- [Tailwind CSS](https://tailwindcss.com)
- No backend; deploy as static files.

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Build

```bash
npm run build
```

Output is in `dist/`. Static and ready for any host.

## Deploy to GitHub Pages

1. In the repo: **Settings → Pages → Build and deployment**
2. Set **Source** to **GitHub Actions**.
3. Push to `main`; the workflow builds Astro and deploys to Pages.
4. Optional: set **Custom domain** to `begindevs.com` and add the DNS records GitHub shows.

The workflow is in [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

## Project structure

```
src/
  components/   # Astro sections (Hero, Section, etc.)
  layouts/      # Layout.astro
  pages/        # index.astro, pricing.astro
  styles/       # global.css (Tailwind + theme)
public/         # favicon, static assets
```
