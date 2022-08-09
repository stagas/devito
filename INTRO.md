devito is a fast http/2 web dev server, inspired by [vite](https://vitejs.dev/).

It uses [swc](https://swc.rs/) and [esbuild](https://esbuild.github.io/).

```sh
devito my-file.tsx
```

The above will serve `my-file.tsx`. It will transform any dependency that is not an ESM module and will refresh on every change.

You will need a [`.swcrc`](https://swc.rs/docs/configuration/swcrc) file at the project's root for the transformations.
