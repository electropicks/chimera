import { Application, Graphics } from "pixi.js";

import { createDeterministicDotSimulation } from "./deterministic-dot";

const PHASE_ZERO_SEED = 20260513;
const DOT_COLOR = 0x7dd3fc;
const DOT_RADIUS_PIXELS = 8;
const FALLBACK_STAGE = { width: 640, height: 360 } as const;

async function bootstrap(): Promise<void> {
  const host = document.querySelector<HTMLDivElement>("#app");

  if (!host) {
    throw new Error("Missing #app host element");
  }

  const app = new Application();

  await app.init({
    antialias: true,
    autoDensity: true,
    background: "#101828",
    height: FALLBACK_STAGE.height,
    preference: "webgl",
    resizeTo: host,
    resolution: window.devicePixelRatio || 1,
    width: FALLBACK_STAGE.width,
  });

  host.appendChild(app.canvas);

  const dot = new Graphics().circle(0, 0, DOT_RADIUS_PIXELS).fill(DOT_COLOR);
  app.stage.addChild(dot);

  const simulation = createDeterministicDotSimulation({
    seed: PHASE_ZERO_SEED,
    bounds: currentBounds(app),
  });

  renderDot(dot, simulation.snapshot().pixel);

  app.ticker.maxFPS = 60;
  app.ticker.add(() => {
    renderDot(dot, simulation.step(currentBounds(app)).pixel);
  });
}

function currentBounds(app: Application): { width: number; height: number } {
  return {
    width: app.screen.width || FALLBACK_STAGE.width,
    height: app.screen.height || FALLBACK_STAGE.height,
  };
}

function renderDot(dot: Graphics, pixel: { readonly x: number; readonly y: number }): void {
  dot.position.set(pixel.x, pixel.y);
}

void bootstrap();
