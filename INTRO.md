devito is a fast web dev server, inspired by [vite](https://vitejs.dev/).

It also uses [esbuild](https://esbuild.github.io/).

```sh
devito my-file.tsx
```

The above will serve `my-file.tsx` and will refresh on every change.

## Open in editor

Allows opening `file[:line[:col]]` links from the DevTools console output, right into your editor. Use `--editor=<editor>` to set your own (defaults to `code`).

> [Get the Chrome DevTools extension.](https://github.com/generalov/open-in-editor-extension)

> [See the supported editors](https://github.com/generalov/open-in-editor#options).

## import.meta.url

`import.meta.url` is transformed to `<location.origin>/@fs/<path>`.

The relative base path `/@fs/` is computed with `--homedir=<path>`. It defaults to `os.homedir()`.

## Workers/Worklets/iframe

```ts
// Worker
new Worker(new URL('./my-worker.js', import.meta.url).href, { type: 'module' })

// AudioWorklet
audioContext.audioWorklet.addModule(
  new URL('./my-audio-worklet.js', import.meta.url).href
)

// iframe
const src = new URL('sandbox-iframe.js', import.meta.url).href
iframe.srcdoc = `<script src="${src}" type="module"></script>`
```

## CSS

```ts
import 'some.css'
```

Statically bundled modules will bundle all css to `bundle.css`.

Dynamically discovered modules (such when using `import()`) will create a `<style>`
element and it'll be appended in `<head>`.

## JSON

```ts
import json from 'some.json'
```

## JSX

```ts
// @jsxImportSource jsx-lib
```

`tsconfig.json`:

```json
"compilerOptions": {
  ...
  "jsx": "react-jsx",
  ...
}
```

## Markdown

```sh
devito README.md
```

## Caching ~ Certificate

To enable browser caching in order to get all the speed benefits, you'll need to create a certificate.

devito will try to find a cert+key for `devito.test` under
`process.env.SSL_CERTS_DEVITO`, `~/.ssl-certs/` or using `--cert=xxx` (minus the `-key.pem` and `.pem` suffixes).

### Make certificate:

```sh
mkcert -install
mkcert devito.test
cp devito.test* ~/.ssl-certs/
```

Then add an entry `127.0.0.1 devito.test` in `/etc/hosts`.

Chrome/Firefox should now cache assets properly for that location.

> More info here: https://jonathanbossenger.com/2019/02/08/setting-up-trusted-ssl-certificates-for-local-development-using-mkcert-on-ubuntu-18-04-with-apache/
