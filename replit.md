# Pallet Planner (Modelo Paletes v2)

A visual pallet planning tool for calculating and displaying how reels fit onto pallets.

Originally created on [CodePen](https://codepen.io/Rorcaid/pen/ogbqOQW).

## Stack

- Vanilla JS + HTML + CSS
- Vite (dev server & build)

## How to run

```
npm run dev
```

Serves on port 5000. No environment variables or secrets required.

## User preferences

- Horizontal reels should display as rounded rectangles (not oval/elliptical shapes). Corner radius is set to 8% of the minimum dimension in `cylRoundedPath` in `script.js`.
