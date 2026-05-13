# Core simulation components

`@creature/sim-core` stores simulation state in bitECS component tables. Component fields are numeric arrays indexed by bitECS entity id (`eid`). Unless otherwise noted, distance units are world units and rates are measured per simulation second; future deterministic tick systems will convert those rates through the fixed tick delta.

## Position

Spatial location in the continuous 2D simulation plane.

| Field | Unit | Description |
| --- | --- | --- |
| `x` | world units | Horizontal coordinate. |
| `y` | world units | Vertical coordinate. |

## Velocity

Current motion vector for an entity.

| Field | Unit | Description |
| --- | --- | --- |
| `vx` | world units / second | Horizontal velocity. |
| `vy` | world units / second | Vertical velocity. |

## Body

Physical and sensing envelope used by movement, collision, and perception systems.

| Field | Unit | Description |
| --- | --- | --- |
| `speed` | world units / second | Intended maximum movement speed. |
| `size` | world units | Body radius used by spatial systems. |
| `sense_radius` | world units | Radius for future perception checks. |

## Health

Creature survivability pool.

| Field | Unit | Description |
| --- | --- | --- |
| `current` | points | Current health value. |
| `max` | points | Maximum health value. |

## Hunger

Creature hunger pressure. Higher `current` values mean the creature is hungrier.

| Field | Unit | Description |
| --- | --- | --- |
| `current` | points | Current hunger value. |
| `max` | points | Maximum hunger value. |
| `decay_rate` | points / second | Rate applied by future metabolism systems. |

## Energy

Available stamina or nutrition. Creatures consume it over time; food uses it as nutrition value.

| Field | Unit | Description |
| --- | --- | --- |
| `current` | points | Current energy value. |
| `max` | points | Maximum energy value. |
| `decay_rate` | points / second | Rate applied by future metabolism systems. |

## Factory archetypes

- `createCreature` adds `Position`, `Velocity`, `Body`, `Health`, `Hunger`, and `Energy`.
- `createFood` adds `Position`, `Body`, and `Energy`.
- `destroyEntity` removes an entity from its bitECS world.
