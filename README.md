

<h1>
devito <a href="https://npmjs.org/package/devito"><img src="https://img.shields.io/badge/npm-v2.1.0-F00.svg?colorA=000"/></a> <a href="src"><img src="https://img.shields.io/badge/loc-1,119-FFF.svg?colorA=000"/></a> <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-F0B.svg?colorA=000"/></a>
</h1>

<p></p>

Fast web dev server

<h4>
<table><tr><td title="Triple click to select and copy paste">
<code>npm i devito -g</code>
</td><td title="Triple click to select and copy paste">
<code>pnpm add devito -g</code>
</td><td title="Triple click to select and copy paste">
<code>yarn global add devito</code>
</td></tr></table>
</h4>

## CLI

<p></p>
<p>
<img width="651.4285714285714" src="cli.png" />
</p>


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




## API

<p>  <details id="DevitoOptions$48" title="Class" ><summary><span><a href="#DevitoOptions$48">#</a></span>  <code><strong>DevitoOptions</strong></code>    </summary>  <a href=""></a>  <ul>        <p>  <details id="constructor$49" title="Constructor" ><summary><span><a href="#constructor$49">#</a></span>  <code><strong>constructor</strong></code><em>(options)</em>    </summary>  <a href=""></a>  <ul>    <p>  <details id="new DevitoOptions$50" title="ConstructorSignature" ><summary><span><a href="#new DevitoOptions$50">#</a></span>  <code><strong>new DevitoOptions</strong></code><em>()</em>    </summary>    <ul><p><a href="#DevitoOptions$48">DevitoOptions</a></p>      <p>  <details id="options$51" title="Parameter" ><summary><span><a href="#options$51">#</a></span>  <code><strong>options</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>{}</code></span>  </summary>    <ul><p><span>Partial</span>&lt;<a href="#DevitoOptions$48">DevitoOptions</a>&gt;</p>        </ul></details></p>  </ul></details></p>    </ul></details><details id="alias$69" title="Property" ><summary><span><a href="#alias$69">#</a></span>  <code><strong>alias</strong></code>    </summary>  <a href=""></a>  <ul><p><span>Record</span>&lt;string, string&gt;</p>        </ul></details><details id="bundle$61" title="Property" ><summary><span><a href="#bundle$61">#</a></span>  <code><strong>bundle</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>true</code></span>  </summary>  <a href=""></a>  <ul><p>boolean</p>        </ul></details><details id="cache$63" title="Property" ><summary><span><a href="#cache$63">#</a></span>  <code><strong>cache</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>true</code></span>  </summary>  <a href=""></a>  <ul><p>boolean</p>        </ul></details><details id="cert$58" title="Property" ><summary><span><a href="#cert$58">#</a></span>  <code><strong>cert</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>...</code></span>  </summary>  <a href=""></a>  <ul><p>string | <span>ServerOptions</span></p>        </ul></details><details id="editor$60" title="Property" ><summary><span><a href="#editor$60">#</a></span>  <code><strong>editor</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>'code'</code></span>  </summary>  <a href=""></a>  <ul><p>string</p>        </ul></details><details id="entryResolveDir$68" title="Property" ><summary><span><a href="#entryResolveDir$68">#</a></span>  <code><strong>entryResolveDir</strong></code>    </summary>  <a href=""></a>  <ul><p>string</p>        </ul></details><details id="entrySource$67" title="Property" ><summary><span><a href="#entrySource$67">#</a></span>  <code><strong>entrySource</strong></code>    </summary>  <a href=""></a>  <ul><p>string</p>        </ul></details><details id="extraAnalyzePaths$70" title="Property" ><summary><span><a href="#extraAnalyzePaths$70">#</a></span>  <code><strong>extraAnalyzePaths</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>[]</code></span>  </summary>  <a href=""></a>  <ul><p>string  []</p>        </ul></details><details id="file$52" title="Property" ><summary><span><a href="#file$52">#</a></span>  <code><strong>file</strong></code>    </summary>  <a href=""></a>  <ul><p>string</p>        </ul></details><details id="hmr$56" title="Property" ><summary><span><a href="#hmr$56">#</a></span>  <code><strong>hmr</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>false</code></span>  </summary>  <a href=""></a>  <ul><p>boolean</p>        </ul></details><details id="homedir$59" title="Property" ><summary><span><a href="#homedir$59">#</a></span>  <code><strong>homedir</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>'~'</code></span>  </summary>  <a href=""></a>  <ul><p>string</p>        </ul></details><details id="hostname$54" title="Property" ><summary><span><a href="#hostname$54">#</a></span>  <code><strong>hostname</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>'devito.test'</code></span>  </summary>  <a href=""></a>  <ul><p>string</p>        </ul></details><details id="inlineSourceMaps$62" title="Property" ><summary><span><a href="#inlineSourceMaps$62">#</a></span>  <code><strong>inlineSourceMaps</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>false</code></span>  </summary>  <a href=""></a>  <ul><p>boolean</p>        </ul></details><details id="ipAddress$57" title="Property" ><summary><span><a href="#ipAddress$57">#</a></span>  <code><strong>ipAddress</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>'0.0.0.0'</code></span>  </summary>  <a href=""></a>  <ul><p>string</p>        </ul></details><details id="port$66" title="Property" ><summary><span><a href="#port$66">#</a></span>  <code><strong>port</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>...</code></span>  </summary>  <a href=""></a>  <ul><p>number</p>        </ul></details><details id="quiet$65" title="Property" ><summary><span><a href="#quiet$65">#</a></span>  <code><strong>quiet</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>false</code></span>  </summary>  <a href=""></a>  <ul><p>boolean</p>        </ul></details><details id="root$53" title="Property" ><summary><span><a href="#root$53">#</a></span>  <code><strong>root</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>'.'</code></span>  </summary>  <a href=""></a>  <ul><p>string</p>        </ul></details><details id="startPort$55" title="Property" ><summary><span><a href="#startPort$55">#</a></span>  <code><strong>startPort</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>3000</code></span>  </summary>  <a href=""></a>  <ul><p>number</p>        </ul></details><details id="watch$64" title="Property" ><summary><span><a href="#watch$64">#</a></span>  <code><strong>watch</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>true</code></span>  </summary>  <a href=""></a>  <ul><p>boolean</p>        </ul></details><details id="entryFile$73" title="Accessor" ><summary><span><a href="#entryFile$73">#</a></span>  <code><strong>entryFile</strong></code>    </summary>  <a href=""></a>  <ul>        </ul></details><details id="rootPath$71" title="Accessor" ><summary><span><a href="#rootPath$71">#</a></span>  <code><strong>rootPath</strong></code>    </summary>  <a href=""></a>  <ul>        </ul></details></p></ul></details><details id="ResourceCache$28" title="Interface" ><summary><span><a href="#ResourceCache$28">#</a></span>  <code><strong>ResourceCache</strong></code>    </summary>  <a href=""></a>  <ul>        <p>  <details id="cache$29" title="Property" ><summary><span><a href="#cache$29">#</a></span>  <code><strong>cache</strong></code>    </summary>  <a href=""></a>  <ul><p><span>Map</span>&lt;string, <span>Deferred</span>&lt;<a href="#ResourceCacheItem$24">ResourceCacheItem</a>&lt;<a href="#T$34">T</a>&gt;&gt;&gt;</p>        </ul></details><details id="getOrUpdate$30" title="Method" ><summary><span><a href="#getOrUpdate$30">#</a></span>  <code><strong>getOrUpdate</strong></code><em>(pathname, args)</em>    </summary>  <a href=""></a>  <ul>    <p>    <details id="pathname$32" title="Parameter" ><summary><span><a href="#pathname$32">#</a></span>  <code><strong>pathname</strong></code>    </summary>    <ul><p>string</p>        </ul></details><details id="args$33" title="Parameter" ><summary><span><a href="#args$33">#</a></span>  <code><strong>args</strong></code>    </summary>    <ul><p>any  []</p>        </ul></details>  <p><strong>getOrUpdate</strong><em>(pathname, args)</em>  &nbsp;=&gt;  <ul><span>Promise</span>&lt;<a href="#ResourceCacheItem$24">ResourceCacheItem</a>&lt;<a href="#T$34">T</a>&gt;&gt;</ul></p></p>    </ul></details></p></ul></details><details id="ResourceCacheItem$24" title="Interface" ><summary><span><a href="#ResourceCacheItem$24">#</a></span>  <code><strong>ResourceCacheItem</strong></code>    </summary>  <a href=""></a>  <ul>        <p>  <details id="payload$26" title="Property" ><summary><span><a href="#payload$26">#</a></span>  <code><strong>payload</strong></code>    </summary>  <a href=""></a>  <ul><p><a href="#T$27">T</a></p>        </ul></details><details id="stats$25" title="Property" ><summary><span><a href="#stats$25">#</a></span>  <code><strong>stats</strong></code>    </summary>  <a href=""></a>  <ul><p><span>Stats</span></p>        </ul></details></p></ul></details><details id="FS_PREFIX$21" title="Variable" ><summary><span><a href="#FS_PREFIX$21">#</a></span>  <code><strong>FS_PREFIX</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>'@fs'</code></span>  </summary>  <a href=""></a>  <ul><p><code>"@fs"</code></p>        </ul></details><details id="caches$22" title="Variable" ><summary><span><a href="#caches$22">#</a></span>  <code><strong>caches</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>...</code></span>  </summary>  <a href=""></a>  <ul><p><span>Set</span>&lt;<span>Map</span>&lt;any, any&gt;&gt;</p>        </ul></details><details id="esbuildCommonOptions$23" title="Variable" ><summary><span><a href="#esbuildCommonOptions$23">#</a></span>  <code><strong>esbuildCommonOptions</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>...</code></span>  </summary>  <a href=""></a>  <ul><p><span>BuildOptions</span></p>        </ul></details><details id="clearDevitoCaches$4" title="Function" ><summary><span><a href="#clearDevitoCaches$4">#</a></span>  <code><strong>clearDevitoCaches</strong></code><em>()</em>    </summary>  <a href=""></a>  <ul>    <p>      <p><strong>clearDevitoCaches</strong><em>()</em>  &nbsp;=&gt;  <ul>void</ul></p></p>    </ul></details><details id="createResourceCache$9" title="Function" ><summary><span><a href="#createResourceCache$9">#</a></span>  <code><strong>createResourceCache</strong></code><em>(getStats, getPayload)</em>    </summary>  <a href=""></a>  <ul>    <p>    <details id="getStats$12" title="Function" ><summary><span><a href="#getStats$12">#</a></span>  <code><strong>getStats</strong></code><em>(pathname)</em>    </summary>    <ul>    <p>    <details id="pathname$15" title="Parameter" ><summary><span><a href="#pathname$15">#</a></span>  <code><strong>pathname</strong></code>    </summary>    <ul><p>string</p>        </ul></details>  <p><strong>getStats</strong><em>(pathname)</em>  &nbsp;=&gt;  <ul><span>Promise</span>&lt;<span>Stats</span>&gt;</ul></p></p>    </ul></details><details id="getPayload$16" title="Function" ><summary><span><a href="#getPayload$16">#</a></span>  <code><strong>getPayload</strong></code><em>(pathname, args)</em>    </summary>    <ul>    <p>    <details id="pathname$19" title="Parameter" ><summary><span><a href="#pathname$19">#</a></span>  <code><strong>pathname</strong></code>    </summary>    <ul><p>string</p>        </ul></details><details id="args$20" title="Parameter" ><summary><span><a href="#args$20">#</a></span>  <code><strong>args</strong></code>    </summary>    <ul><p>any  []</p>        </ul></details>  <p><strong>getPayload</strong><em>(pathname, args)</em>  &nbsp;=&gt;  <ul><span>Promise</span>&lt;<a href="#T$11">T</a>&gt;</ul></p></p>    </ul></details>  <p><strong>createResourceCache</strong>&lt;<span>T</span>&gt;<em>(getStats, getPayload)</em>  &nbsp;=&gt;  <ul><a href="#ResourceCache$28">ResourceCache</a>&lt;<a href="#T$11">T</a>&gt;</ul></p></p>    </ul></details><details id="devito$39" title="Function" ><summary><span><a href="#devito$39">#</a></span>  <code><strong>devito</strong></code><em>(partialOptions)</em>    </summary>  <a href=""></a>  <ul>    <p>    <details id="partialOptions$41" title="Parameter" ><summary><span><a href="#partialOptions$41">#</a></span>  <code><strong>partialOptions</strong></code>    </summary>    <ul><p><span>Partial</span>&lt;<a href="#DevitoOptions$48">DevitoOptions</a>&gt;</p>        </ul></details>  <p><strong>devito</strong><em>(partialOptions)</em>  &nbsp;=&gt;  <ul><span>Promise</span>&lt;{<p>  <details id="esbuild$45" title="Property" ><summary><span><a href="#esbuild$45">#</a></span>  <code><strong>esbuild</strong></code>    </summary>  <a href=""></a>  <ul><p>undefined | <span>Esbuild</span></p>        </ul></details><details id="options$44" title="Property" ><summary><span><a href="#options$44">#</a></span>  <code><strong>options</strong></code>    </summary>  <a href=""></a>  <ul><p><a href="#DevitoOptions$48">DevitoOptions</a></p>        </ul></details><details id="url$43" title="Property" ><summary><span><a href="#url$43">#</a></span>  <code><strong>url</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>localAddress</code></span>  </summary>  <a href=""></a>  <ul><p>string</p>        </ul></details><details id="close$46" title="Method" ><summary><span><a href="#close$46">#</a></span>  <code><strong>close</strong></code><em>()</em>    </summary>  <a href=""></a>  <ul>    <p>      <p><strong>close</strong><em>()</em>  &nbsp;=&gt;  <ul><span>Promise</span>&lt;void&gt;</ul></p></p>    </ul></details></p>}&gt;</ul></p></p>    </ul></details><details id="forgetFile$6" title="Function" ><summary><span><a href="#forgetFile$6">#</a></span>  <code><strong>forgetFile</strong></code><em>(pathname)</em>    </summary>  <a href=""></a>  <ul>    <p>    <details id="pathname$8" title="Parameter" ><summary><span><a href="#pathname$8">#</a></span>  <code><strong>pathname</strong></code>    </summary>    <ul><p>string</p>        </ul></details>  <p><strong>forgetFile</strong><em>(pathname)</em>  &nbsp;=&gt;  <ul>void</ul></p></p>    </ul></details><details id="readFile$35" title="Function" ><summary><span><a href="#readFile$35">#</a></span>  <code><strong>readFile</strong></code><em>(key, args)</em>    </summary>  <a href=""></a>  <ul>    <p>    <details id="key$37" title="Parameter" ><summary><span><a href="#key$37">#</a></span>  <code><strong>key</strong></code>    </summary>    <ul><p>string</p>        </ul></details><details id="args$38" title="Parameter" ><summary><span><a href="#args$38">#</a></span>  <code><strong>args</strong></code>    </summary>    <ul><p>[    ]</p>        </ul></details>  <p><strong>readFile</strong><em>(key, args)</em>  &nbsp;=&gt;  <ul><span>Promise</span>&lt;string&gt;</ul></p></p>    </ul></details><details id="roundSeconds$1" title="Function" ><summary><span><a href="#roundSeconds$1">#</a></span>  <code><strong>roundSeconds</strong></code><em>(x)</em>    </summary>  <a href=""></a>  <ul>    <p>    <details id="x$3" title="Parameter" ><summary><span><a href="#x$3">#</a></span>  <code><strong>x</strong></code>    </summary>    <ul><p>number | <span>Date</span></p>        </ul></details>  <p><strong>roundSeconds</strong><em>(x)</em>  &nbsp;=&gt;  <ul>number</ul></p></p>    </ul></details></p>

## Credits
- [@stagas/chalk](https://npmjs.org/package/@stagas/chalk) by [stagas](https://github.com/stagas) &ndash; Terminal string styling done right (+ CommonJS build)
- [apply-sourcemaps](https://npmjs.org/package/apply-sourcemaps) by [stagas](https://github.com/stagas) &ndash; Fetch and apply sourcemaps in logs and stack traces originating from the browser or puppeteer.
- [decarg](https://npmjs.org/package/decarg) by [stagas](https://github.com/stagas) &ndash; decorator based cli arguments parser
- [each-dep](https://npmjs.org/package/each-dep) by [stagas](https://github.com/stagas) &ndash; Async iterator walk of a file's dependencies.
- [easy-https-server](https://npmjs.org/package/easy-https-server) by [stagas](https://github.com/stagas) &ndash; Easy barebones https server.
- [esbuild](https://npmjs.org/package/esbuild) by [evanw](https://github.com/evanw) &ndash; An extremely fast JavaScript and CSS bundler and minifier.
- [esbuild-plugin-alias](https://npmjs.org/package/esbuild-plugin-alias) by [Igor Adamenko](https://igoradamenko.com) &ndash; esbuild plugin for path aliases
- [event-toolkit](https://npmjs.org/package/event-toolkit) by [stagas](https://github.com/stagas) &ndash; Toolkit for DOM events.
- [everyday-node](https://npmjs.org/package/everyday-node) by [stagas](https://github.com/stagas) &ndash; Everyday node utilities.
- [everyday-utils](https://npmjs.org/package/everyday-utils) by [stagas](https://github.com/stagas) &ndash; Everyday utilities
- [github-markdown-css](https://npmjs.org/package/github-markdown-css) by [Sindre Sorhus](https://sindresorhus.com) &ndash; The minimal amount of CSS to replicate the GitHub Markdown style
- [import-meta-resolve](https://npmjs.org/package/import-meta-resolve) by [Titus Wormer](https://wooorm.com) &ndash; Resolve things like Node.js — ponyfill for `import.meta.resolve`
- [make-cert](https://npmjs.org/package/make-cert) by [Vinson Chuong](https://github.com/vinsonchuong) &ndash; Quickly generate a self-signed cert to start an HTTPS server
- [markdown-it](https://npmjs.org/package/markdown-it) by [markdown-it](https://github.com/markdown-it) &ndash; Markdown-it - modern pluggable markdown parser.
- [mime-types](https://npmjs.org/package/mime-types) by [jshttp](https://github.com/jshttp) &ndash; The ultimate javascript content-type utility.
- [open-in-editor](https://npmjs.org/package/open-in-editor) by [Roman Dvornov](https://github.com/lahmatiy) &ndash; Open file in editor
- [qrcode-terminal](https://npmjs.org/package/qrcode-terminal) by [gtanner](https://github.com/gtanner) &ndash; QRCodes, in the terminal
- [source-map-support](https://npmjs.org/package/source-map-support) by [evanw](https://github.com/evanw) &ndash; Fixes stack traces for files with source maps

## Contributing

[Fork](https://github.com/stagas/devito/fork) or [edit](https://github.dev/stagas/devito) and submit a PR.

All contributions are welcome!

## License

<a href="LICENSE">MIT</a> &copy; 2022 [stagas](https://github.com/stagas)
