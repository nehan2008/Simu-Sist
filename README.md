# SimuSist

SimuSist is an interactive virtual laboratory for exploring science experiments, adjusting simulation parameters, and recording observations.

## Development

```sh
npm install
npm run dev
```

## Production build

```sh
npm run build
npm run preview
```

Vite writes the production site to `dist/`.

## Deploying to Vercel

Use the Vite framework preset, `npm run build` as the build command, and `dist` as the output directory. The root `vercel.json` rewrite supports direct navigation and refreshes on React Router routes.
