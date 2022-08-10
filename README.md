<h1>
devito <a href="https://npmjs.org/package/devito"><img src="https://img.shields.io/badge/npm-v1.3.2-F00.svg?colorA=000"/></a> <a href="src"><img src="https://img.shields.io/badge/loc-420-FFF.svg?colorA=000"/></a> <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-F0B.svg?colorA=000"/></a>
</h1>

<p></p>

Fast http/2 web dev server

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
<img width="403.4285714285714" src="cli.png" />
</p>

devito is a fast http/2 web dev server, inspired by [vite](https://vitejs.dev/).

It uses [swc](https://swc.rs/) and [esbuild](https://esbuild.github.io/).

```sh
devito my-file.tsx
```

The above will serve `my-file.tsx`. It will transform any dependency that is not an ESM module and will refresh on every change.

You will need a [`.swcrc`](https://swc.rs/docs/configuration/swcrc) file at the project's root for the transformations.

## API

<p>  <details id="DevitoOptions$20" title="Class" open><summary><span><a href="#DevitoOptions$20">#</a></span>  <code><strong>DevitoOptions</strong></code>    </summary>  <a href="src/devito.ts#L18">src/devito.ts#L18</a>  <ul>        <p>  <details id="constructor$21" title="Constructor" ><summary><span><a href="#constructor$21">#</a></span>  <code><strong>constructor</strong></code><em>(options)</em>    </summary>  <a href="src/devito.ts#L30">src/devito.ts#L30</a>  <ul>    <p>  <details id="new DevitoOptions$22" title="ConstructorSignature" ><summary><span><a href="#new DevitoOptions$22">#</a></span>  <code><strong>new DevitoOptions</strong></code><em>()</em>    </summary>    <ul><p><a href="#DevitoOptions$20">DevitoOptions</a></p>      <p>  <details id="options$23" title="Parameter" ><summary><span><a href="#options$23">#</a></span>  <code><strong>options</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>{}</code></span>  </summary>    <ul><p><span>Partial</span>&lt;<a href="#DevitoOptions$20">DevitoOptions</a>&gt;</p>        </ul></details></p>  </ul></details></p>    </ul></details><details id="alias$30" title="Property" ><summary><span><a href="#alias$30">#</a></span>  <code><strong>alias</strong></code>    </summary>  <a href="src/devito.ts#L26">src/devito.ts#L26</a>  <ul><p><span>Record</span>&lt;string, string&gt;</p>        </ul></details><details id="depCache$31" title="Property" ><summary><span><a href="#depCache$31">#</a></span>  <code><strong>depCache</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>...</code></span>  </summary>  <a href="src/devito.ts#L27">src/devito.ts#L27</a>  <ul><p>undefined | <span>Map</span>&lt;string, {<p>  <details id="ids$34" title="Property" ><summary><span><a href="#ids$34">#</a></span>  <code><strong>ids</strong></code>    </summary>  <a href="src/.fastpm/-/each-dep@1.1.0/dist/types/each-dep.d.ts#L7">src/.fastpm/-/each-dep@1.1.0/dist/types/each-dep.d.ts#L7</a>  <ul><p>readonly     [  string, string  ]  []</p>        </ul></details><details id="source$33" title="Property" ><summary><span><a href="#source$33">#</a></span>  <code><strong>source</strong></code>    </summary>  <a href="src/.fastpm/-/each-dep@1.1.0/dist/types/each-dep.d.ts#L6">src/.fastpm/-/each-dep@1.1.0/dist/types/each-dep.d.ts#L6</a>  <ul><p>string</p>        </ul></details></p>}&gt;</p>        </ul></details><details id="entrySource$29" title="Property" ><summary><span><a href="#entrySource$29">#</a></span>  <code><strong>entrySource</strong></code>    </summary>  <a href="src/devito.ts#L25">src/devito.ts#L25</a>  <ul><p>string</p>        </ul></details><details id="file$24" title="Property" ><summary><span><a href="#file$24">#</a></span>  <code><strong>file</strong></code>    </summary>  <a href="src/devito.ts#L19">src/devito.ts#L19</a>  <ul><p>string</p>        </ul></details><details id="forceExit$35" title="Property" ><summary><span><a href="#forceExit$35">#</a></span>  <code><strong>forceExit</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>false</code></span>  </summary>  <a href="src/devito.ts#L28">src/devito.ts#L28</a>  <ul><p>boolean</p>        </ul></details><details id="port$26" title="Property" ><summary><span><a href="#port$26">#</a></span>  <code><strong>port</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>3000</code></span>  </summary>  <a href="src/devito.ts#L21">src/devito.ts#L21</a>  <ul><p>number</p>        </ul></details><details id="quiet$28" title="Property" ><summary><span><a href="#quiet$28">#</a></span>  <code><strong>quiet</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>false</code></span>  </summary>  <a href="src/devito.ts#L23">src/devito.ts#L23</a>  <ul><p>boolean</p>        </ul></details><details id="root$25" title="Property" ><summary><span><a href="#root$25">#</a></span>  <code><strong>root</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>'.'</code></span>  </summary>  <a href="src/devito.ts#L20">src/devito.ts#L20</a>  <ul><p>string</p>        </ul></details><details id="watch$27" title="Property" ><summary><span><a href="#watch$27">#</a></span>  <code><strong>watch</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>true</code></span>  </summary>  <a href="src/devito.ts#L22">src/devito.ts#L22</a>  <ul><p>boolean</p>        </ul></details><details id="entryFile$38" title="Accessor" ><summary><span><a href="#entryFile$38">#</a></span>  <code><strong>entryFile</strong></code>    </summary>  <a href="src/devito.ts#L38">src/devito.ts#L38</a>  <ul>        </ul></details><details id="rootPath$36" title="Accessor" ><summary><span><a href="#rootPath$36">#</a></span>  <code><strong>rootPath</strong></code>    </summary>  <a href="src/devito.ts#L34">src/devito.ts#L34</a>  <ul>        </ul></details></p></ul></details><details id="devito$1" title="Function" open><summary><span><a href="#devito$1">#</a></span>  <code><strong>devito</strong></code><em>(partialOptions)</em>    </summary>  <a href="src/devito.ts#L43">src/devito.ts#L43</a>  <ul>    <p>    <details id="partialOptions$3" title="Parameter" ><summary><span><a href="#partialOptions$3">#</a></span>  <code><strong>partialOptions</strong></code>    </summary>    <ul><p><span>Partial</span>&lt;<a href="#DevitoOptions$20">DevitoOptions</a>&gt;</p>        </ul></details>  <p><strong>devito</strong><em>(partialOptions)</em>  &nbsp;=&gt;  <ul><span>Promise</span>&lt;{<p>  <details id="analyze$7" title="Property" ><summary><span><a href="#analyze$7">#</a></span>  <code><strong>analyze</strong></code>    </summary>  <a href="src/devito.ts#L499">src/devito.ts#L499</a>  <ul><p><details id="__type$8" title="Function" ><summary><span><a href="#__type$8">#</a></span>  <em>(entryFile, entrySource)</em>    </summary>    <ul>    <p>    <details id="entryFile$10" title="Parameter" ><summary><span><a href="#entryFile$10">#</a></span>  <code><strong>entryFile</strong></code>    </summary>    <ul><p>string</p>        </ul></details><details id="entrySource$11" title="Parameter" ><summary><span><a href="#entrySource$11">#</a></span>  <code><strong>entrySource</strong></code>    </summary>    <ul><p>string</p>        </ul></details>  <p><strong></strong><em>(entryFile, entrySource)</em>  &nbsp;=&gt;  <ul><span>Promise</span>&lt;void&gt;</ul></p></p>    </ul></details></p>        </ul></details><details id="close$17" title="Property" ><summary><span><a href="#close$17">#</a></span>  <code><strong>close</strong></code>    </summary>  <a href="src/devito.ts#L499">src/devito.ts#L499</a>  <ul><p><details id="__type$18" title="Function" ><summary><span><a href="#__type$18">#</a></span>  <em>()</em>    </summary>    <ul>    <p>      <p><strong></strong><em>()</em>  &nbsp;=&gt;  <ul><span>Promise</span>&lt;void&gt;</ul></p></p>    </ul></details></p>        </ul></details><details id="devito$5" title="Property" ><summary><span><a href="#devito$5">#</a></span>  <code><strong>devito</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>server</code></span>  </summary>  <a href="src/devito.ts#L499">src/devito.ts#L499</a>  <ul><p><span>Http2SecureServer</span></p>        </ul></details><details id="updateCache$12" title="Property" ><summary><span><a href="#updateCache$12">#</a></span>  <code><strong>updateCache</strong></code>    </summary>  <a href="src/devito.ts#L499">src/devito.ts#L499</a>  <ul><p><details id="__type$13" title="Function" ><summary><span><a href="#__type$13">#</a></span>  <em>(rootFilter, force)</em>    </summary>    <ul>    <p>    <details id="rootFilter$15" title="Parameter" ><summary><span><a href="#rootFilter$15">#</a></span>  <code><strong>rootFilter</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>'/'</code></span>  </summary>    <ul><p>string</p>        </ul></details><details id="force$16" title="Parameter" ><summary><span><a href="#force$16">#</a></span>  <code><strong>force</strong></code>  <span><span>&nbsp;=&nbsp;</span>  <code>false</code></span>  </summary>    <ul><p>boolean</p>        </ul></details>  <p><strong></strong><em>(rootFilter, force)</em>  &nbsp;=&gt;  <ul>void</ul></p></p>    </ul></details></p>        </ul></details><details id="url$6" title="Property" ><summary><span><a href="#url$6">#</a></span>  <code><strong>url</strong></code>    </summary>  <a href="src/devito.ts#L499">src/devito.ts#L499</a>  <ul><p>string</p>        </ul></details></p>}&gt;</ul></p></p>    </ul></details></p>

## Credits

- [@stagas/chalk](https://npmjs.org/package/@stagas/chalk) by [stagas](https://github.com/stagas) &ndash; Terminal string styling done right (+ CommonJS build)
- [@swc-node/core](https://npmjs.org/package/@swc-node/core) by [LongYinan](https://github.com/swc-project) &ndash; Faster swc nodejs binding
- [decarg](https://npmjs.org/package/decarg) by [stagas](https://github.com/stagas) &ndash; decorator based cli arguments parser
- [each-dep](https://npmjs.org/package/each-dep) by [stagas](https://github.com/stagas) &ndash; Async iterator walk of a file's dependencies.
- [esbuild](https://npmjs.org/package/esbuild) by [evanw](https://github.com/evanw) &ndash; An extremely fast JavaScript and CSS bundler and minifier.
- [event-toolkit](https://npmjs.org/package/event-toolkit) by [stagas](https://github.com/stagas) &ndash; Toolkit for DOM events.
- [everyday-node](https://npmjs.org/package/everyday-node) by [stagas](https://github.com/stagas) &ndash; Everyday node utilities.
- [everyday-utils](https://npmjs.org/package/everyday-utils) by [stagas](https://github.com/stagas) &ndash; Everyday utilities
- [find-free-ports](https://npmjs.org/package/find-free-ports) by [Sam Vervaeck](https://github.com/samvv) &ndash; Find multiple free ports on localhost
- [github-markdown-css](https://npmjs.org/package/github-markdown-css) by [Sindre Sorhus](https://sindresorhus.com) &ndash; The minimal amount of CSS to replicate the GitHub Markdown style
- [http-graceful-shutdown](https://npmjs.org/package/http-graceful-shutdown) by [Sebastian Hildebrandt](https://plus-innovations.com) &ndash; gracefully shuts downs http server
- [make-cert](https://npmjs.org/package/make-cert) by [Vinson Chuong](https://github.com/vinsonchuong) &ndash; Quickly generate a self-signed cert to start an HTTPS server
- [markdown-it](https://npmjs.org/package/markdown-it) by [markdown-it](https://github.com/markdown-it) &ndash; Markdown-it - modern pluggable markdown parser.
- [mime-types](https://npmjs.org/package/mime-types) by [jshttp](https://github.com/jshttp) &ndash; The ultimate javascript content-type utility.
- [qrcode-terminal](https://npmjs.org/package/qrcode-terminal) by [gtanner](https://github.com/gtanner) &ndash; QRCodes, in the terminal
- [running-at](https://npmjs.org/package/running-at) by [Maximilian Schiller](https://github.com/BetaHuhn) &ndash; Get local and network ip address
- [sse](https://npmjs.org/package/sse) by [Einar Otto Stangvik](http://2x.io)

## Contributing

[Fork](https://github.com/stagas/devito/fork) or [edit](https://github.dev/stagas/devito) and submit a PR.

All contributions are welcome!

## License

<a href="LICENSE">MIT</a> &copy; 2022 [stagas](https://github.com/stagas)
