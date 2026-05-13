import { Application, Graphics } from "pixi.js";

import {
  type CreaturePocSnapshot,
  createCreaturePocSimulation,
  type PocBounds,
} from "./creature-poc";

const POC_SEED = 20260513;
const WORLD_BOUNDS: PocBounds = { width: 100, height: 100 };
const FALLBACK_STAGE = { width: 960, height: 640 } as const;
const WORLD_PADDING_PIXELS = 36;
const SIM_FRAMES_PER_TICK = 5;

interface Scene {
  frame: Graphics;
  foods: Graphics;
  sensor: Graphics;
  target: Graphics;
  creature: Graphics;
}

interface Hud {
  action: HTMLElement;
  energy: HTMLElement;
  energyBar: HTMLElement;
  food: HTMLElement;
  hunger: HTMLElement;
  hungerBar: HTMLElement;
  tick: HTMLElement;
}

interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

async function bootstrap(): Promise<void> {
  const host = document.querySelector<HTMLDivElement>("#app");

  if (!host) {
    throw new Error("Missing #app host element");
  }

  const app = new Application();

  await app.init({
    antialias: true,
    autoDensity: true,
    background: "#17261d",
    height: FALLBACK_STAGE.height,
    preference: "webgl",
    resizeTo: host,
    resolution: window.devicePixelRatio || 1,
    width: FALLBACK_STAGE.width,
  });

  host.appendChild(app.canvas);

  const simulation = createCreaturePocSimulation({
    bounds: WORLD_BOUNDS,
    seed: POC_SEED,
  });
  const scene = createScene(app);
  const hud = createHud(host);
  let snapshot = simulation.snapshot();
  let frame = 0;

  render(app, scene, snapshot);
  updateHud(hud, snapshot);

  app.ticker.maxFPS = 60;
  app.ticker.add(() => {
    frame += 1;

    if (frame % SIM_FRAMES_PER_TICK === 0) {
      snapshot = simulation.step();
      updateHud(hud, snapshot);
    }

    render(app, scene, snapshot);
  });
}

function createScene(app: Application): Scene {
  const scene: Scene = {
    creature: new Graphics(),
    foods: new Graphics(),
    frame: new Graphics(),
    sensor: new Graphics(),
    target: new Graphics(),
  };

  app.stage.addChild(scene.frame);
  app.stage.addChild(scene.target);
  app.stage.addChild(scene.sensor);
  app.stage.addChild(scene.foods);
  app.stage.addChild(scene.creature);

  return scene;
}

function createHud(host: HTMLElement): Hud {
  const root = document.createElement("section");
  root.className = "chimera-hud";
  root.setAttribute("aria-label", "Creature status");

  const tick = createMetric(root, "Tick");
  const action = createMetric(root, "Action");
  const hunger = createBarMetric(root, "Hunger", "hunger");
  const energy = createBarMetric(root, "Energy", "energy");
  const food = createMetric(root, "Food");

  host.appendChild(root);

  return {
    action: action.value,
    energy: energy.value,
    energyBar: energy.bar,
    food: food.value,
    hunger: hunger.value,
    hungerBar: hunger.bar,
    tick: tick.value,
  };
}

function createMetric(root: HTMLElement, labelText: string): { value: HTMLElement } {
  const row = document.createElement("div");
  row.className = "hud-row";

  const label = document.createElement("span");
  label.className = "hud-label";
  label.textContent = labelText;

  const value = document.createElement("span");
  value.className = "hud-value";

  row.append(label, value);
  root.appendChild(row);

  return { value };
}

function createBarMetric(
  root: HTMLElement,
  labelText: string,
  className: string,
): { bar: HTMLElement; value: HTMLElement } {
  const wrapper = document.createElement("div");
  wrapper.className = "hud-bar-row";

  const metric = createMetric(wrapper, labelText);
  const track = document.createElement("div");
  track.className = "hud-bar";
  const bar = document.createElement("div");
  bar.className = `hud-bar-fill ${className}`;

  track.appendChild(bar);
  wrapper.appendChild(track);
  root.appendChild(wrapper);

  return { bar, value: metric.value };
}

function render(app: Application, scene: Scene, snapshot: CreaturePocSnapshot): void {
  const transform = createTransform(app);

  drawFrame(scene.frame, transform);
  drawTarget(scene.target, transform, snapshot);
  drawSensor(scene.sensor, transform, snapshot);
  drawFoods(scene.foods, transform, snapshot);
  drawCreature(scene.creature, transform, snapshot);
}

function drawFrame(graphics: Graphics, transform: ViewTransform): void {
  const width = WORLD_BOUNDS.width * transform.scale;
  const height = WORLD_BOUNDS.height * transform.scale;

  graphics
    .clear()
    .rect(transform.offsetX, transform.offsetY, width, height)
    .fill(0x213a29)
    .stroke({ alpha: 0.9, color: 0xb7d99c, width: 2 });

  for (let line = 10; line < WORLD_BOUNDS.width; line += 10) {
    const x = transform.offsetX + line * transform.scale;
    const y = transform.offsetY + line * transform.scale;

    graphics
      .moveTo(x, transform.offsetY)
      .lineTo(x, transform.offsetY + height)
      .moveTo(transform.offsetX, y)
      .lineTo(transform.offsetX + width, y);
  }

  graphics.stroke({ alpha: 0.13, color: 0xddeecf, width: 1 });
}

function drawTarget(
  graphics: Graphics,
  transform: ViewTransform,
  snapshot: CreaturePocSnapshot,
): void {
  graphics.clear();

  const target = snapshot.perception.nearestFood;

  if (!target) {
    return;
  }

  const food = snapshot.foods.find((current) => current.id === target.entity);

  if (!food) {
    return;
  }

  const creature = toScreen(transform, snapshot.creature.position);
  const targetPoint = toScreen(transform, food.position);

  graphics
    .moveTo(creature.x, creature.y)
    .lineTo(targetPoint.x, targetPoint.y)
    .stroke({ alpha: 0.55, color: 0xf4d35e, width: 2 });
}

function drawSensor(
  graphics: Graphics,
  transform: ViewTransform,
  snapshot: CreaturePocSnapshot,
): void {
  const creature = toScreen(transform, snapshot.creature.position);

  graphics
    .clear()
    .circle(creature.x, creature.y, snapshot.creature.senseRadius * transform.scale)
    .stroke({ alpha: 0.22, color: 0x7dd3fc, width: 2 });
}

function drawFoods(
  graphics: Graphics,
  transform: ViewTransform,
  snapshot: CreaturePocSnapshot,
): void {
  graphics.clear();

  for (const food of snapshot.foods) {
    const point = toScreen(transform, food.position);

    graphics.circle(point.x, point.y, 5).fill(0xf4d35e);
    graphics.circle(point.x - 1.5, point.y - 1.5, 1.5).fill(0xfffbeb);
  }
}

function drawCreature(
  graphics: Graphics,
  transform: ViewTransform,
  snapshot: CreaturePocSnapshot,
): void {
  const point = toScreen(transform, snapshot.creature.position);
  const radius = Math.max(7, snapshot.creature.size * transform.scale * 0.9);

  graphics
    .clear()
    .circle(point.x, point.y, radius + 3)
    .fill({ alpha: 0.18, color: 0x7dd3fc })
    .circle(point.x, point.y, radius)
    .fill(0x5eead4)
    .stroke({ alpha: 0.9, color: 0x0f172a, width: 2 })
    .circle(point.x + radius * 0.25, point.y - radius * 0.2, Math.max(1.8, radius * 0.18))
    .fill(0x0f172a);
}

function updateHud(hud: Hud, snapshot: CreaturePocSnapshot): void {
  hud.tick.textContent = String(snapshot.tick);
  hud.action.textContent = snapshot.action;
  hud.hunger.textContent = `${Math.round(snapshot.creature.hunger)} / 100`;
  hud.energy.textContent = `${Math.round(snapshot.creature.energy)} / 100`;
  hud.food.textContent = String(snapshot.foods.length);
  hud.hungerBar.style.width = `${clamp(snapshot.creature.hunger, 0, 100)}%`;
  hud.energyBar.style.width = `${clamp(snapshot.creature.energy, 0, 100)}%`;
}

function createTransform(app: Application): ViewTransform {
  const screenWidth = app.screen.width || FALLBACK_STAGE.width;
  const screenHeight = app.screen.height || FALLBACK_STAGE.height;
  const usableWidth = Math.max(screenWidth - WORLD_PADDING_PIXELS * 2, 1);
  const usableHeight = Math.max(screenHeight - WORLD_PADDING_PIXELS * 2, 1);
  const scale = Math.min(usableWidth / WORLD_BOUNDS.width, usableHeight / WORLD_BOUNDS.height);

  return {
    offsetX: (screenWidth - WORLD_BOUNDS.width * scale) / 2,
    offsetY: (screenHeight - WORLD_BOUNDS.height * scale) / 2,
    scale,
  };
}

function toScreen(
  transform: ViewTransform,
  position: { readonly x: number; readonly y: number },
): { x: number; y: number } {
  return {
    x: transform.offsetX + position.x * transform.scale,
    y: transform.offsetY + position.y * transform.scale,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

void bootstrap();
