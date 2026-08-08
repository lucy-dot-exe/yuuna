// Each mechanic below is a standalone NextStateFunction — it wraps its
// whole body in "if this event is actually mine" and returns a new state
// from inside it. There's no early-return guard clause: if the condition
// doesn't hold, the function just falls off the end and implicitly
// returns undefined, meaning "no change, keep going". runEngine runs the
// whole list in order for every event, feeding each function's output
// into the next.
//
// freezeOnGameOver runs first and returns Yuuna.STOP (not undefined) once
// you've lost, which stops every mechanic after it from running for that
// event — so none of them need their own "unless the game is over" check.

import {
  TOWER_RANGE,
  TOWER_COOLDOWN,
  TOWER_DAMAGE,
  TURRET_COST,
  BEAM_DURATION,
  ENEMY_SPEED,
  EXPLOSION_DURATION,
  CANVAS_WIDTH,
  LANE_Y,
  distance,
  spawnIntervalAt,
  hpTiersAt,
} from "./constants";
import { GameState, Beam, Explosion } from "./state";

export const freezeOnGameOver: NextStateFunction<GameState> = ({ state }) => {
  if (state.lives <= 0) {
    return Yuuna.STOP;
  }
};

export const buildTurret: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "CLICK" && event.id === "build-area" && state.gold >= TURRET_COST) {
    return {
      ...state,
      gold: state.gold - TURRET_COST,
      turrets: [
        // worldMouse, not mouse — the turret's x/y is world-space state
        // (build-area itself is world-space too, per render.ts, so this
        // still lands exactly where the click landed even zoomed out)
        ...state.turrets,
        { id: state.nextTurretId, x: event.worldMouse.x, y: event.worldMouse.y, cooldown: 0 },
      ],
      nextTurretId: state.nextTurretId + 1,
    };
  }
};

export const advanceTime: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "TIME") {
    return { ...state, elapsed: state.elapsed + event.delta };
  }
};

export const moveEnemies: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "TIME") {
    return {
      ...state,
      enemies: state.enemies.map((enemy) => ({
        ...enemy,
        x: enemy.x + ENEMY_SPEED * event.delta,
      })),
    };
  }
};

// Each turret counts down its cooldown, then — once ready — fires a
// single shot at whichever enemy in range is closest to breaking
// through, instead of splitting damage across all of them. A big
// enough wave can still outrun a lone turret's fire rate.
export const fireTurrets: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "TIME") {
    const delta = event.delta;
    const damageByEnemyId = new Map<number, number>();
    const newBeams: Beam[] = [];

    const turrets = state.turrets.map((turret) => {
      const cooldown = turret.cooldown - delta;

      if (cooldown > 0) {
        return { ...turret, cooldown };
      }

      const target = state.enemies
        .filter((enemy) => distance(turret, { x: enemy.x, y: LANE_Y }) <= TOWER_RANGE)
        .sort((a, b) => b.x - a.x)[0];

      if (target === undefined) {
        return { ...turret, cooldown: 0 };
      }

      damageByEnemyId.set(target.id, (damageByEnemyId.get(target.id) ?? 0) + TOWER_DAMAGE);
      newBeams.push({
        from: { x: turret.x, y: turret.y },
        to: { x: target.x, y: LANE_Y },
        timeLeft: BEAM_DURATION,
      });

      return { ...turret, cooldown: TOWER_COOLDOWN };
    });

    const enemies = state.enemies.map((enemy) => {
      const damage = damageByEnemyId.get(enemy.id);
      return damage === undefined ? enemy : { ...enemy, hp: enemy.hp - damage };
    });

    return { ...state, turrets, enemies, beams: [...state.beams, ...newBeams] };
  }
};

// Kills add to the score, pay gold proportional to how tough the enemy
// was, and leave an explosion behind, instead of surviving to the next
// step
export const resolveKills: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "TIME") {
    let score = state.score;
    let gold = state.gold;
    let nextExplosionId = state.nextExplosionId;
    const newExplosions: Explosion[] = [];

    const enemies = state.enemies.filter((enemy) => {
      if (enemy.hp > 0) return true;

      score += 1;
      gold += enemy.maxHp;
      newExplosions.push({ id: nextExplosionId, x: enemy.x, y: LANE_Y, age: 0 });
      nextExplosionId += 1;
      return false;
    });

    return {
      ...state,
      enemies,
      score,
      gold,
      explosions: [...state.explosions, ...newExplosions],
      nextExplosionId,
    };
  }
};

// Enemies that reach the end of the lane cost a life instead of surviving
export const resolveLeaks: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "TIME") {
    let lives = state.lives;

    const enemies = state.enemies.filter((enemy) => {
      if (enemy.x <= CANVAS_WIDTH) return true;

      lives -= 1;
      return false;
    });

    return { ...state, enemies, lives };
  }
};

// Spawn a new enemy once the timer runs out — both the wait and the
// pool of possible hp tiers depend on how far into the current wave
// (and how many waves in) we are
export const spawnEnemies: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "TIME") {
    const spawnTimer = state.spawnTimer - event.delta;

    if (spawnTimer > 0) {
      return { ...state, spawnTimer };
    }

    const tiers = hpTiersAt(state.elapsed);
    const hp = tiers[Math.floor(Math.random() * tiers.length)];

    return {
      ...state,
      enemies: [...state.enemies, { id: state.nextEnemyId, x: 0, hp, maxHp: hp }],
      nextEnemyId: state.nextEnemyId + 1,
      spawnTimer: spawnTimer + spawnIntervalAt(state.elapsed),
    };
  }
};

// Age out beams so each one only flashes for BEAM_DURATION
export const ageBeams: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "TIME") {
    return {
      ...state,
      beams: state.beams
        .map((beam) => ({ ...beam, timeLeft: beam.timeLeft - event.delta }))
        .filter((beam) => beam.timeLeft > 0),
    };
  }
};

// Age out explosions so each one only plays through once
export const ageExplosions: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "TIME") {
    return {
      ...state,
      explosions: state.explosions
        .map((explosion) => ({ ...explosion, age: explosion.age + event.delta }))
        .filter((explosion) => explosion.age < EXPLOSION_DURATION),
    };
  }
};
