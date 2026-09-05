# @smartmath/ui

Shared UI catalog for SmartMath web surfaces. The palette and component
contracts mirror the React Native app under `smartmath-app` so the same
design language ships across web and mobile.

## Layout

```
src/
  tokens/            colors, radii, shadows, fonts (JS + CSS variables)
  components/
    Button/          Button.tsx + Button.css + index.ts
    Card/            Card.tsx  + Card.css  + index.ts
  styles.css         one @import bundle consumers include once
  index.ts           re-exports every public symbol
```

Each component sits in its own folder with its stylesheet and a barrel
`index.ts`. New atoms follow the same shape.

## Use it

Add the workspace dep (already added in `packages/web`):

```json
"dependencies": { "@smartmath/ui": "*" }
```

Import the stylesheet once (e.g. `main.tsx`) and the components where
needed:

```ts
import "@smartmath/ui/styles.css";
import { Button, Card } from "@smartmath/ui";
```

## Extracting to its own repo / npm package

The package is intentionally self-contained:

- no imports from other workspace packages
- no build step (source ships as ESM TypeScript, consumers bundle it)
- only `react` is a peer dependency

To publish standalone:

1. `git subtree split --prefix=packages/ui -b ui-standalone`, push
   that branch to a new repo.
2. Add a build (`tsc` + copy CSS) so the published tarball ships `.js` +
   `.d.ts` instead of `.ts`.
3. Rename to `@smartmath/ui` (or whatever npm scope) and publish.

Nothing in the current source needs to change to make that possible.
