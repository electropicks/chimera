import type { EntitySnapshot, WorldSnapshot } from "@creature/sim-core";

export const rendererPackageName = "@creature/renderer";
export const rendererPackageResponsibility =
  "PixiJS rendering that reads simulation snapshots and emits presentation state only.";

export type RenderSpriteKind = "creature" | "food" | "threat";
export type RenderShape = "circle" | "square";

export interface RenderSpriteModel {
  id: number;
  kind: RenderSpriteKind;
  shape: RenderShape;
  color: number;
  position: {
    x: number;
    y: number;
  };
  radius: number;
  headingRadians: number;
}

export interface RenderGraphic {
  clear(): this;
  circle(x: number, y: number, radius: number): this;
  rect(x: number, y: number, width: number, height: number): this;
  fill(color: number): this;
  stroke(options?: { alpha?: number; color?: number; width?: number }): this;
  moveTo(x: number, y: number): this;
  lineTo(x: number, y: number): this;
  setPosition(x: number, y: number): void;
  setRotation(rotation: number): void;
  destroy(): void;
}

export interface SnapshotRendererOptions {
  createGraphic: () => RenderGraphic;
  addGraphic?: (graphic: RenderGraphic) => void;
  removeGraphic?: (graphic: RenderGraphic) => void;
}

export interface SnapshotRenderer {
  update(snapshot: WorldSnapshot): void;
  spriteIds(): number[];
  destroy(): void;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface CameraState {
  followEntityId?: number;
  offset: {
    x: number;
    y: number;
  };
  scale: number;
  viewport: Viewport;
}

export interface CameraTransform extends CameraState {
  translation: {
    x: number;
    y: number;
  };
}

export interface CameraInput {
  drag?: {
    dx: number;
    dy: number;
  };
  keys?: readonly string[];
  pinchScale?: number;
  wheelDelta?: number;
}

export interface PixiRendererOptions {
  background?: string;
  height?: number;
  host?: HTMLElement;
  width?: number;
}

export interface PixiSnapshotRenderer {
  application: unknown;
  render(snapshot: WorldSnapshot, camera?: CameraState): void;
  renderer: SnapshotRenderer;
}

export interface CameraLayerTransformTarget {
  position: {
    set(x: number, y: number): void;
  };
  scale: {
    set(value: number): void;
  };
}

const CREATURE_COLOR = 0x5eead4;
const FOOD_COLOR = 0x22c55e;
const THREAT_COLOR = 0xef4444;
const CAMERA_KEYBOARD_PAN = 24;
const MIN_CAMERA_SCALE = 0.25;
const MAX_CAMERA_SCALE = 8;

export function deriveSpriteModels(snapshot: WorldSnapshot): RenderSpriteModel[] {
  return snapshot.entities.flatMap((entity) => {
    const kind = classifyEntity(entity);

    if (!kind || !entity.position || !entity.body) {
      return [];
    }

    return [
      {
        color: colorForKind(kind),
        headingRadians: headingRadians(entity),
        id: entity.id,
        kind,
        position: entity.position,
        radius: entity.body.size,
        shape: kind === "threat" ? "square" : "circle",
      },
    ];
  });
}

export function createSnapshotRenderer(options: SnapshotRendererOptions): SnapshotRenderer {
  const graphicsByEntityId = new Map<number, RenderGraphic>();

  return {
    update(snapshot) {
      const models = deriveSpriteModels(snapshot);
      const liveIds = new Set(models.map((model) => model.id));

      for (const [entityId, graphic] of graphicsByEntityId) {
        if (!liveIds.has(entityId)) {
          options.removeGraphic?.(graphic);
          graphic.destroy();
          graphicsByEntityId.delete(entityId);
        }
      }

      for (const model of models) {
        let graphic = graphicsByEntityId.get(model.id);

        if (!graphic) {
          graphic = options.createGraphic();
          graphicsByEntityId.set(model.id, graphic);
          options.addGraphic?.(graphic);
        }

        drawSprite(graphic, model);
      }
    },
    spriteIds() {
      return [...graphicsByEntityId.keys()].sort((left, right) => left - right);
    },
    destroy() {
      for (const graphic of graphicsByEntityId.values()) {
        options.removeGraphic?.(graphic);
        graphic.destroy();
      }

      graphicsByEntityId.clear();
    },
  };
}

export function getCameraTransform(snapshot: WorldSnapshot, state: CameraState): CameraTransform {
  const followed = state.followEntityId
    ? snapshot.entities.find((entity) => entity.id === state.followEntityId)
    : undefined;
  const center = followed?.position ?? { x: 0, y: 0 };

  return {
    ...state,
    translation: {
      x: state.viewport.width / 2 - (center.x + state.offset.x) * state.scale,
      y: state.viewport.height / 2 - (center.y + state.offset.y) * state.scale,
    },
  };
}

export function applyCameraInput(state: CameraTransform, input: CameraInput): CameraState {
  let offsetX = state.offset.x;
  let offsetY = state.offset.y;
  let scale = state.scale;
  let hasManualMovement = false;

  for (const key of input.keys ?? []) {
    if (key === "KeyA") {
      offsetX -= CAMERA_KEYBOARD_PAN / scale;
      hasManualMovement = true;
    } else if (key === "KeyD") {
      offsetX += CAMERA_KEYBOARD_PAN / scale;
      hasManualMovement = true;
    } else if (key === "KeyW") {
      offsetY -= CAMERA_KEYBOARD_PAN / scale;
      hasManualMovement = true;
    } else if (key === "KeyS") {
      offsetY += CAMERA_KEYBOARD_PAN / scale;
      hasManualMovement = true;
    }
  }

  if (input.drag) {
    offsetX += input.drag.dx / scale;
    offsetY += input.drag.dy / scale;
    hasManualMovement = true;
  }

  if (input.wheelDelta !== undefined) {
    scale = clamp(scale * (input.wheelDelta < 0 ? 1.1 : 0.9), MIN_CAMERA_SCALE, MAX_CAMERA_SCALE);
  }

  if (input.pinchScale !== undefined) {
    scale = clamp(scale * input.pinchScale, MIN_CAMERA_SCALE, MAX_CAMERA_SCALE);
  }

  const manualOffset = hasManualMovement
    ? offsetFromManualMovement(state, offsetX, offsetY)
    : { x: offsetX, y: offsetY };

  return {
    followEntityId: hasManualMovement ? undefined : state.followEntityId,
    offset: manualOffset,
    scale,
    viewport: state.viewport,
  };
}

export function applyCameraTransformToLayer(
  layer: CameraLayerTransformTarget,
  snapshot: WorldSnapshot,
  camera?: CameraState,
): void {
  if (!camera) {
    layer.scale.set(1);
    layer.position.set(0, 0);
    return;
  }

  const transform = getCameraTransform(snapshot, camera);
  layer.scale.set(transform.scale);
  layer.position.set(transform.translation.x, transform.translation.y);
}

export async function createPixiSnapshotRenderer(
  options: PixiRendererOptions = {},
): Promise<PixiSnapshotRenderer> {
  const { Application, Container, Graphics } = await import("pixi.js");
  const application = new Application();

  await application.init({
    antialias: true,
    autoDensity: true,
    background: options.background ?? "#17261d",
    height: options.height ?? 640,
    resolution: globalThis.devicePixelRatio || 1,
    width: options.width ?? 960,
  });

  options.host?.appendChild(application.canvas);

  const worldLayer = new Container();
  application.stage.addChild(worldLayer);

  const renderer = createSnapshotRenderer({
    addGraphic: (graphic) => {
      if (graphic instanceof PixiGraphicAdapter) {
        worldLayer.addChild(graphic.graphics);
      }
    },
    createGraphic: () => new PixiGraphicAdapter(new Graphics()),
    removeGraphic: (graphic) => {
      if (graphic instanceof PixiGraphicAdapter) {
        worldLayer.removeChild(graphic.graphics);
      }
    },
  });

  return {
    application,
    render(snapshot, camera) {
      renderer.update(snapshot);

      applyCameraTransformToLayer(worldLayer, snapshot, camera);
    },
    renderer,
  };
}

function offsetFromManualMovement(
  state: CameraTransform,
  offsetX: number,
  offsetY: number,
): CameraState["offset"] {
  const currentWorldCenter = {
    x: (state.viewport.width / 2 - state.translation.x) / state.scale,
    y: (state.viewport.height / 2 - state.translation.y) / state.scale,
  };

  return {
    x: currentWorldCenter.x + (offsetX - state.offset.x),
    y: currentWorldCenter.y + (offsetY - state.offset.y),
  };
}

function classifyEntity(entity: EntitySnapshot): RenderSpriteKind | null {
  if (!entity.position || !entity.body || !entity.energy) {
    return null;
  }

  if (entity.resource) {
    return entity.resource.current > 0 ? "food" : null;
  }

  if (entity.velocity && entity.health && entity.hunger) {
    return "creature";
  }

  if (entity.velocity && entity.health) {
    return "threat";
  }

  return null;
}

function drawSprite(graphic: RenderGraphic, model: RenderSpriteModel): void {
  graphic.clear();

  if (model.shape === "circle") {
    graphic.circle(0, 0, model.radius).fill(model.color);
  } else {
    graphic
      .rect(-model.radius, -model.radius, model.radius * 2, model.radius * 2)
      .fill(model.color);
  }

  if (model.kind === "creature") {
    graphic
      .moveTo(0, 0)
      .lineTo(model.radius * 1.8, 0)
      .stroke({ alpha: 0.9, color: 0x0f172a, width: Math.max(0.1, model.radius * 0.18) });
  }

  graphic.setPosition(model.position.x, model.position.y);
  graphic.setRotation(model.headingRadians);
}

function colorForKind(kind: RenderSpriteKind): number {
  if (kind === "food") {
    return FOOD_COLOR;
  }

  if (kind === "threat") {
    return THREAT_COLOR;
  }

  return CREATURE_COLOR;
}

function headingRadians(entity: EntitySnapshot): number {
  const vx = entity.velocity?.vx ?? 0;
  const vy = entity.velocity?.vy ?? 0;

  if (vx === 0 && vy === 0) {
    return 0;
  }

  return Math.atan2(vy, vx);
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

class PixiGraphicAdapter implements RenderGraphic {
  constructor(readonly graphics: import("pixi.js").Graphics) {}

  clear(): this {
    this.graphics.clear();
    return this;
  }

  circle(x: number, y: number, radius: number): this {
    this.graphics.circle(x, y, radius);
    return this;
  }

  rect(x: number, y: number, width: number, height: number): this {
    this.graphics.rect(x, y, width, height);
    return this;
  }

  fill(color: number): this {
    this.graphics.fill(color);
    return this;
  }

  stroke(options?: { alpha?: number; color?: number; width?: number }): this {
    this.graphics.stroke(options);
    return this;
  }

  moveTo(x: number, y: number): this {
    this.graphics.moveTo(x, y);
    return this;
  }

  lineTo(x: number, y: number): this {
    this.graphics.lineTo(x, y);
    return this;
  }

  setPosition(x: number, y: number): void {
    this.graphics.position.set(x, y);
  }

  setRotation(rotation: number): void {
    this.graphics.rotation = rotation;
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
