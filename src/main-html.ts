import * as path from 'path'
import { FS_PREFIX } from './core'

export function mainHtml(
  title: string,
  options: { quiet: boolean; bundle: boolean; watch: boolean; homedir: string; alias?: Record<string, string> },
) {
  const importmap = Object.fromEntries(
    Object.entries(options.alias ?? {})
      .map(([key, pathname]) => [key, `/${FS_PREFIX}/${path.relative(options.homedir, pathname)}`])
  )
  return /*html*/ `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link
    rel="icon"
    href="data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='47.2' r='34'%0Afill='transparent' stroke='%23fff' stroke-width='7.5' /%3E%3C/svg%3E"
    type="image/svg+xml"
  />
  <title>${title}</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
    }

    body {
      --light: #eee;
      --dark: #222;
      --color: var(--dark);
      --background: var(--light);
      color: var(--color);
      background: var(--background)
    }

    @media (prefers-color-scheme: dark) {
      body:not(.light) {
        --color: var(--light);
        --background: var(--dark);
      }
    }
  </style>
  <link rel="stylesheet" href="/bundle.css">
</head><body><main></main>
${
    options.bundle ? '' : /*html*/ `<script type="importmap">
{
  "imports": ${JSON.stringify(importmap, null, 2)}
}
</script>`
  }
<script src="/bundle.js" type="module"></script>
<script src="/devito.js" type="module" defer async></script>
</body></html>`
}
