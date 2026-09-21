# Hannah's Portfolio

A [MyST](https://mystmd.org) site. Source lives in `index.md`, `projects/`,
`styles.css` and `myst.yml`; `_build/` is generated and safe to delete.

## Working on it

```bash
npm install          # once
npm start            # live dev server, reloads as you edit
```

## Building the HTML

```bash
npm run serve        # build the static HTML, then open http://localhost:3000
npm run preview      # serve an existing build without rebuilding
npm run build        # build only, into _build/html/
```

**Do not open `_build/html/index.html` by double-clicking it.** The built
pages link their CSS and JavaScript with root-absolute paths
(`/build/_assets/…`, `/myst-theme.css`), and each `index.html` redirects
itself to its clean directory URL. Over `file://` those resolve against your
filesystem root, so the page loads with no styling — or bounces straight to a
folder listing. The site needs to be served over HTTP, which is what
`npm run serve` does.

## Publishing to GitHub Pages

Pushing to `main` deploys automatically via `.github/workflows/deploy.yml`.
The workflow asks GitHub what path the site is served from and passes it to
MyST as `BASE_URL`, so a project site (`<username>.github.io/<repo>`) and a
user site (`<username>.github.io`) both work with no edit.

One-time setup: in the repository, **Settings -> Pages -> Build and deployment
-> Source**, choose **GitHub Actions**.

To build with a base path locally:

```bash
BASE_URL=/<repo-name> npm run build:pages
```
