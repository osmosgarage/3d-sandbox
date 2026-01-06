# 3D Sandbox - Three.js Learning & Testing

A lightweight Vite + TypeScript setup for experimenting with modern WebGL using Three.js. Designed for fast iteration and easy Blender GLTF/GLB imports.

## Tech Stack
- Vite
- TypeScript
- Three.js

## Getting Started
1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Open http://localhost:5173 (opens automatically)
4. Edit files in `src/` and see hot reload updates instantly.

## Production Build
- `npm run build` → outputs optimized assets to `dist/`
- `npm run preview` → serves the production build locally

## Models Workflow
- Export Blender models as GLTF 2.0 (`.glb` or `.gltf`)
- Place exported files in `public/models/`
- Reference them from `src/main.ts` via the `modelConfigs` array
- Use the on-screen controls to toggle visibility and adjust lighting

## Testing on NUC
- Run dev server: `npm run dev`
- Access from other machines: `http://<nuc-ip>:5173`
