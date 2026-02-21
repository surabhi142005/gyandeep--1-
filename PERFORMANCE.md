Performance checklist

- Use dynamic imports and `manualChunks` (vite.config.ts updated)
- Lazy-load heavy components (charts, 3D scenes)
- Profile with Chrome DevTools and React Profiler
- Use production builds and measure bundle with `vite build --report`
- Cache static assets and use long-lived cache headers in production
- Optimize images and compress assets
