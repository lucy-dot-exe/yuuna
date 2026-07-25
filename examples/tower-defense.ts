// Tower Defense — enemies walk down the lane in escalating waves, turrets
// melt anything that gets close enough. Kills pay gold, and gold builds
// more turrets off the path. Let 5 enemies through and it's game over.

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const LANE_Y = 270;
const LANE_HEIGHT = 40;

const TOWER_RANGE = 160;
const TOWER_COOLDOWN = 700; // milliseconds between shots
const TOWER_DAMAGE = 1; // damage dealt per shot
const TURRET_COST = 5; // gold required to build a turret
const BEAM_DURATION = 120; // milliseconds the firing line stays visible

const ENEMY_SPEED = 0.05; // pixels per millisecond
const ENEMY_HP_TIERS = [1, 2, 4, 8]; // each spawn is randomly one of these
const ENEMY_RADIUS = 14;

// Enemies spawn in repeating 20s waves: each wave starts spaced out, gets
// denser toward the middle, then spaces back out again — and every new
// wave unlocks the next, tougher hp tier, so the "spaced out" phase you
// return to is harder than the one you started with.
const WAVE_DURATION = 20000;
const BASE_SPAWN_INTERVAL = 1400;
const SPAWN_INTERVAL_AMPLITUDE = 800;

const START_LIVES = 5;

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const spawnIntervalAt = (elapsed: number): number => {
  const waveProgress = (elapsed % WAVE_DURATION) / WAVE_DURATION;
  return BASE_SPAWN_INTERVAL - SPAWN_INTERVAL_AMPLITUDE * Math.sin(Math.PI * waveProgress);
};

const hpTiersAt = (elapsed: number): number[] => {
  const waveIndex = Math.floor(elapsed / WAVE_DURATION);
  const maxTierIndex = Math.min(ENEMY_HP_TIERS.length - 1, waveIndex);
  return ENEMY_HP_TIERS.slice(0, maxTierIndex + 1);
};

// Damage is always dealt 1 point at a time, so an enemy's hp passes
// through every one of these thresholds on its way down — its color
// doubles as a health readout instead of shrinking its radius
const colorForHp = (hp: number): string => {
  if (hp >= 8) return "#8b0000";
  if (hp >= 4) return "#d62828";
  if (hp >= 2) return "#f77f00";
  return "#fcbf49";
};

// Create a type for the state of your game
type Enemy = { id: number; x: number; hp: number; maxHp: number };
type Turret = { id: number; x: number; y: number; cooldown: number };
type Beam = { from: { x: number; y: number }; to: { x: number; y: number }; timeLeft: number };
type GameState = {
  enemies: Enemy[];
  nextEnemyId: number;
  spawnTimer: number;
  elapsed: number;
  turrets: Turret[];
  nextTurretId: number;
  beams: Beam[];
  lives: number;
  score: number;
  gold: number;
};

// Create the initial state
const initialState: GameState = {
  enemies: [],
  nextEnemyId: 0,
  spawnTimer: spawnIntervalAt(0),
  elapsed: 0,
  turrets: [{ id: 0, x: CANVAS_WIDTH / 2, y: LANE_Y - 80, cooldown: 0 }],
  nextTurretId: 1,
  beams: [],
  lives: START_LIVES,
  score: 0,
  gold: 0,
};

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  const renderables: Renderable[] = [
    // Buildable ground, above and below the path — clicking either builds
    // a turret at that spot
    {
      type: "RECTANGLE",
      color: "#0d1831",
      isClickable: true,
      id: "build-area",
      position: { x: 0, y: 0 },
      size: { width: CANVAS_WIDTH, height: LANE_Y - LANE_HEIGHT / 2 },
    },
    {
      type: "RECTANGLE",
      color: "#0d1831",
      isClickable: true,
      id: "build-area",
      position: { x: 0, y: LANE_Y + LANE_HEIGHT / 2 },
      size: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT - (LANE_Y + LANE_HEIGHT / 2) },
    },

    // The path enemies walk down — turrets can't be built here
    {
      type: "RECTANGLE",
      color: "#222831",
      position: { x: 0, y: LANE_Y - LANE_HEIGHT / 2 },
      size: { width: CANVAS_WIDTH, height: LANE_HEIGHT },
    },

    // Turrets: each focuses one enemy at a time within TOWER_RANGE
    ...state.turrets.map(
      (turret): Renderable => ({
        type: "RECTANGLE",
        color: "steelblue",
        position: { x: turret.x - 20, y: turret.y - 20 },
        size: { width: 40, height: 40 },
      })
    ),

    // A line flashes from turret to target for a moment when it fires
    ...state.beams.map(
      (beam): Renderable => ({
        type: "LINE",
        from: beam.from,
        to: beam.to,
        color: "yellow",
        width: 3,
      })
    ),

    { type: "TEXT", text: `Score: ${state.score}`, color: "white", position: { x: 20, y: 30 } },
    { type: "TEXT", text: `Lives: ${state.lives}`, color: "white", position: { x: 20, y: 70 } },
    { type: "TEXT", text: `Gold: ${state.gold}`, color: "#ffd700", position: { x: 20, y: 110 } },
    {
      type: "TEXT",
      text: `Click off the path to build a turret (${TURRET_COST} gold)`,
      color: "#8899aa",
      position: { x: 20, y: CANVAS_HEIGHT - 30 },
    },

    // Enemy color reflects current hp — see colorForHp
    ...state.enemies.map(
      (enemy): Renderable => ({
        type: "CIRCLE",
        color: colorForHp(enemy.hp),
        position: { x: enemy.x, y: LANE_Y },
        radius: ENEMY_RADIUS,
      })
    ),
  ];

  if (state.lives <= 0) {
    renderables.push({
      type: "TEXT",
      text: "Game Over",
      color: "white",
      position: { x: CANVAS_WIDTH / 2, y: LANE_Y },
      align: { x: "center", y: "middle" },
    });
  }

  return { renderables };
};

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

const freezeOnGameOver: NextStateFunction<GameState> = ({ state }) => {
  if (state.lives <= 0) {
    return Yuuna.STOP;
  }
};

const buildTurret: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "CLICK" && event.id === "build-area" && state.gold >= TURRET_COST) {
    return {
      ...state,
      gold: state.gold - TURRET_COST,
      turrets: [
        ...state.turrets,
        { id: state.nextTurretId, x: event.mouse.x, y: event.mouse.y, cooldown: 0 },
      ],
      nextTurretId: state.nextTurretId + 1,
    };
  }
};

const advanceTime: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "TIME") {
    return { ...state, elapsed: state.elapsed + event.delta };
  }
};

const moveEnemies: NextStateFunction<GameState> = ({ state, event }) => {
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
const fireTurrets: NextStateFunction<GameState> = ({ state, event }) => {
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

// Kills add to the score, and pay gold proportional to how tough the
// enemy was, instead of surviving to the next step
const resolveKills: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "TIME") {
    let score = state.score;
    let gold = state.gold;

    const enemies = state.enemies.filter((enemy) => {
      if (enemy.hp > 0) return true;

      score += 1;
      gold += enemy.maxHp;
      return false;
    });

    return { ...state, enemies, score, gold };
  }
};

// Enemies that reach the end of the lane cost a life instead of surviving
const resolveLeaks: NextStateFunction<GameState> = ({ state, event }) => {
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
const spawnEnemies: NextStateFunction<GameState> = ({ state, event }) => {
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
const ageBeams: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "TIME") {
    return {
      ...state,
      beams: state.beams
        .map((beam) => ({ ...beam, timeLeft: beam.timeLeft - event.delta }))
        .filter((beam) => beam.timeLeft > 0),
    };
  }
};

// Runs the engine — nextState is just the list of mechanics above, run in
// order for every event
Yuuna.runEngine<GameState>({
  initialState,
  render,
  nextState: [
    freezeOnGameOver,
    buildTurret,
    advanceTime,
    moveEnemies,
    fireTurrets,
    resolveKills,
    resolveLeaks,
    spawnEnemies,
    ageBeams,
  ],

  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831" },
});
