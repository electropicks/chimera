import type { WorldSnapshot } from "@creature/sim-core";
import { describe, expect, test } from "vitest";

import {
  applyCameraInput,
  createSnapshotRenderer,
  deriveSpriteModels,
  getCameraTransform,
  type RenderGraphic,
} from "./index";

describe("deriveSpriteModels", () => {
  test("derives creature, active food, and threat sprite models from a sim snapshot", () => {
    const snapshot = snapshotWithEntities([
      {
        id: 1,
        position: { x: 10, y: 15 },
        velocity: { vx: 0, vy: 2 },
        body: { speed: 2, size: 1.25, sense_radius: 12 },
        health: { current: 100, max: 100 },
        hunger: { current: 20, max: 100, decay_rate: 1 },
        energy: { current: 80, max: 100, decay_rate: 1 },
      },
      {
        id: 2,
        position: { x: 20, y: 25 },
        body: { speed: 0, size: 0.5, sense_radius: 0 },
        energy: { current: 15, max: 15, decay_rate: 0 },
        resource: {
          current: 15,
          max: 15,
          nutrition: 15,
          regrow_ticks: 30,
          regrow_remaining: 0,
        },
      },
      {
        id: 3,
        position: { x: 30, y: 35 },
        body: { speed: 1, size: 1.5, sense_radius: 8 },
        velocity: { vx: -1, vy: 0 },
        health: { current: 50, max: 50 },
        energy: { current: 20, max: 20, decay_rate: 0 },
      },
      {
        id: 4,
        position: { x: 40, y: 45 },
        body: { speed: 0, size: 0.5, sense_radius: 0 },
        energy: { current: 0, max: 15, decay_rate: 0 },
        resource: {
          current: 0,
          max: 15,
          nutrition: 15,
          regrow_ticks: 30,
          regrow_remaining: 10,
        },
      },
    ]);

    expect(deriveSpriteModels(snapshot)).toEqual([
      {
        color: 0x5eead4,
        headingRadians: Math.PI / 2,
        id: 1,
        kind: "creature",
        position: { x: 10, y: 15 },
        radius: 1.25,
        shape: "circle",
      },
      {
        color: 0x22c55e,
        headingRadians: 0,
        id: 2,
        kind: "food",
        position: { x: 20, y: 25 },
        radius: 0.5,
        shape: "circle",
      },
      {
        color: 0xef4444,
        headingRadians: Math.PI,
        id: 3,
        kind: "threat",
        position: { x: 30, y: 35 },
        radius: 1.5,
        shape: "square",
      },
    ]);
  });
});

describe("createSnapshotRenderer", () => {
  test("creates, updates, and destroys pooled graphics keyed by entity id", () => {
    const factory = new MockGraphicFactory();
    const renderer = createSnapshotRenderer({ createGraphic: () => factory.create() });

    renderer.update(snapshotWithEntities([creature(1, 1, 2), food(2, 5, 6)]));
    renderer.update(snapshotWithEntities([creature(1, 3, 4), food(3, 7, 8)]));

    expect(factory.created).toHaveLength(3);
    expect(factory.created[0]?.commands).toContain("circle:0,0,1");
    expect(factory.created[0]?.commands).toContain("lineTo:1.8,0");
    expect(factory.created[0]?.position).toEqual({ x: 3, y: 4 });
    expect(factory.created[1]?.destroyed).toBe(true);
    expect(factory.created[2]?.position).toEqual({ x: 7, y: 8 });
    expect(renderer.spriteIds()).toEqual([1, 3]);
  });
});

describe("camera", () => {
  test("follows the selected entity and applies pan and zoom input", () => {
    const snapshot = snapshotWithEntities([creature(1, 50, 25)]);

    const followed = getCameraTransform(snapshot, {
      followEntityId: 1,
      offset: { x: 0, y: 0 },
      scale: 2,
      viewport: { width: 200, height: 100 },
    });
    const panned = applyCameraInput(followed, {
      drag: { dx: -10, dy: 5 },
      keys: ["KeyD"],
      wheelDelta: -1,
    });

    expect(followed).toEqual({
      followEntityId: 1,
      offset: { x: 0, y: 0 },
      scale: 2,
      translation: { x: 0, y: 0 },
      viewport: { width: 200, height: 100 },
    });
    expect(panned.scale).toBeGreaterThan(followed.scale);
    expect(panned.offset.x).toBeGreaterThan(followed.offset.x);
    expect(panned.offset.y).toBe(2.5);
    expect(panned.followEntityId).toBeUndefined();
  });
});

class MockGraphicFactory {
  readonly created: MockGraphic[] = [];

  create(): MockGraphic {
    const graphic = new MockGraphic();
    this.created.push(graphic);
    return graphic;
  }
}

class MockGraphic implements RenderGraphic {
  readonly commands: string[] = [];
  destroyed = false;
  position = { x: 0, y: 0 };
  rotation = 0;

  clear(): this {
    this.commands.push("clear");
    return this;
  }

  circle(x: number, y: number, radius: number): this {
    this.commands.push(`circle:${x},${y},${radius}`);
    return this;
  }

  rect(x: number, y: number, width: number, height: number): this {
    this.commands.push(`rect:${x},${y},${width},${height}`);
    return this;
  }

  fill(color: number): this {
    this.commands.push(`fill:${color}`);
    return this;
  }

  stroke(): this {
    this.commands.push("stroke");
    return this;
  }

  moveTo(x: number, y: number): this {
    this.commands.push(`moveTo:${x},${y}`);
    return this;
  }

  lineTo(x: number, y: number): this {
    this.commands.push(`lineTo:${x},${y}`);
    return this;
  }

  setPosition(x: number, y: number): void {
    this.position = { x, y };
  }

  setRotation(rotation: number): void {
    this.rotation = rotation;
  }

  destroy(): void {
    this.destroyed = true;
  }
}

function creature(id: number, x: number, y: number): WorldSnapshot["entities"][number] {
  return {
    id,
    body: { speed: 1, size: 1, sense_radius: 5 },
    energy: { current: 100, max: 100, decay_rate: 1 },
    health: { current: 100, max: 100 },
    hunger: { current: 0, max: 100, decay_rate: 1 },
    position: { x, y },
    velocity: { vx: 1, vy: 0 },
  };
}

function food(id: number, x: number, y: number): WorldSnapshot["entities"][number] {
  return {
    id,
    body: { speed: 0, size: 0.5, sense_radius: 0 },
    energy: { current: 10, max: 10, decay_rate: 0 },
    position: { x, y },
    resource: {
      current: 10,
      max: 10,
      nutrition: 10,
      regrow_ticks: 10,
      regrow_remaining: 0,
    },
  };
}

function snapshotWithEntities(entities: WorldSnapshot["entities"]): WorldSnapshot {
  return {
    bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
    entities,
    events: [],
    lastSystemOrder: [],
    obstacles: [],
    resourceSpawnCursor: 0,
    resources: null,
    seed: 1,
    tick: 0,
    worldSeed: 1,
  };
}
