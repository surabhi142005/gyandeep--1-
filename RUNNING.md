Run the project locally

Prerequisites
- Node.js 18+ or 20 (LTS recommended)
- npm or yarn

Install dependencies

```bash
npm install
# or
npm ci
```

If `npm ci` fails due to devDependency resolution on your registry, run `npm install` instead.

Start the frontend (dev)

```bash
npm run dev
```

Start the backend (dev)

```bash
node server/index.js
```

Run tests (if dependencies installed)

```bash
npm run test
# or
npx vitest
```

Build production

```bash
npm run build
```
