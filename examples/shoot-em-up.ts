// Shoot Em Up — the ship follows your mouse, hold the mouse button down to
// fire, random enemies fall from the top and end the run on contact

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 600;

const SHIP_RADIUS = 16;
const BULLET_RADIUS = 4;
const BULLET_SPEED = 0.6; // pixels per millisecond
const FIRE_INTERVAL = 220; // milliseconds between shots while held down

const ENEMY_RADIUS = 14;
const ENEMY_SPEED = 0.12; // pixels per millisecond
const ENEMY_SPAWN_INTERVAL = 700; // milliseconds, randomized a bit per spawn

type Bullet = { id: number; x: number; y: number };
type Enemy = { id: number; x: number; y: number };

// Create a type for the state of your game
type GameState = {
  ship: { x: number; y: number };
  fireCooldown: number;
  bullets: Bullet[];
  nextBulletId: number;
  enemies: Enemy[];
  nextEnemyId: number;
  spawnTimer: number;
  score: number;
  gameOver: boolean;
};

// Create the initial state
const initialState: GameState = {
  ship: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60 },
  fireCooldown: 0,
  bullets: [],
  nextBulletId: 0,
  enemies: [],
  nextEnemyId: 0,
  spawnTimer: ENEMY_SPAWN_INTERVAL,
  score: 0,
  gameOver: false,
};

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { cursor?: "none"; renderables: Renderable[] };
const render: RenderFunction = (state) => {
  const renderables: Renderable[] = [
    // Covers the whole canvas so MOUSE_MOVE keeps reporting the cursor's
    // position no matter where it is — that's how the ship "follows the
    // mouse" without the engine needing a raw, always-on mouse-position
    // event of its own.
    Yuuna.rectangle({
      id: "arena",
      isHoverable: true,
      trackMouseMovement: true,
      color: "transparent",
      position: { x: 0, y: 0 },
      size: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    }),

    ...state.enemies.map((enemy) =>
      Yuuna.circle({
        color: "#e05a4b",
        position: { x: enemy.x, y: enemy.y },
        radius: ENEMY_RADIUS,
      })
    ),

    ...state.bullets.map((bullet) =>
      Yuuna.circle({
        color: "#ffd76a",
        position: { x: bullet.x, y: bullet.y },
        radius: BULLET_RADIUS,
      })
    ),

    // The ship itself — a cockpit circle nested inside the hull so it
    // rides along at the same position without repeating state.ship.x/y
    Yuuna.circle({
      color: "#4fc3f7",
      position: state.ship,
      radius: SHIP_RADIUS,
      children: [Yuuna.circle({ color: "#0d1831", position: { x: 0, y: 0 }, radius: SHIP_RADIUS / 2 })],
    }),

    Yuuna.text({ text: `Score: ${state.score}`, color: "white", position: { x: 20, y: 20 } }),
    Yuuna.text({
      text: "Move the mouse to fly, click and hold to shoot",
      color: "#8899aa",
      position: { x: 20, y: CANVAS_HEIGHT - 30 },
    }),
  ];

  if (state.gameOver) {
    renderables.push(
      Yuuna.text({
        text: "Game Over",
        color: "white",
        fontSize: 48,
        position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
        align: { x: "center", y: "middle" },
      })
    );
  }

  // The ship already stands in for the pointer, so the OS cursor is just
  // a second one drawn on top of it — hidden the same way the arena
  // RECTANGLE above tracks the mouse, as a property of what render()
  // returns rather than something reached for via the DOM.
  return { cursor: "none", renderables };
};

// Each mechanic below only handles the one thing its name says —
// examples/mechanics-pipeline.ts is dedicated to demonstrating exactly
// this, in miniature. A plain `if` with no return falls off the end
// (implicit undefined), meaning "no change, keep going" — nextState runs
// the whole list in order for every event.

const freezeOnGameOver: NextStateFunction<GameState> = ({ state }) => {
  if (state.gameOver) {
    return Yuuna.STOP;
  }
};

const followMouse: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "MOUSE_MOVE" && event.id === "arena") {
    return { ...state, ship: event.worldMouse };
  }
};

// mouseButton (see NextStateProps in src/engine/types.ts) is the
// primary mouse button's held state — checking mouseButton.isPressed
// here directly is the whole mechanic; no bridging through a custom
// event or a raw canvas.addEventListener needed to know it's held.
const fireBullets: NextStateFunction<GameState> = ({ state, event, mouseButton }) => {
  if (event.tag !== "TIME") return;

  const fireCooldown = state.fireCooldown - event.delta;

  if (!mouseButton.isPressed || fireCooldown > 0) {
    return { ...state, fireCooldown };
  }

  return {
    ...state,
    fireCooldown: fireCooldown + FIRE_INTERVAL,
    bullets: [...state.bullets, { id: state.nextBulletId, x: state.ship.x, y: state.ship.y - SHIP_RADIUS }],
    nextBulletId: state.nextBulletId + 1,
  };
};

const moveBullets: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "TIME") {
    return {
      ...state,
      bullets: state.bullets
        .map((bullet) => ({ ...bullet, y: bullet.y - BULLET_SPEED * event.delta }))
        .filter((bullet) => bullet.y > -BULLET_RADIUS),
    };
  }
};

const spawnEnemies: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag !== "TIME") return;

  const spawnTimer = state.spawnTimer - event.delta;

  if (spawnTimer > 0) {
    return { ...state, spawnTimer };
  }

  const x = ENEMY_RADIUS + Math.random() * (CANVAS_WIDTH - 2 * ENEMY_RADIUS);

  return {
    ...state,
    enemies: [...state.enemies, { id: state.nextEnemyId, x, y: -ENEMY_RADIUS }],
    nextEnemyId: state.nextEnemyId + 1,
    // Randomized so spawns don't fall into a single predictable rhythm
    spawnTimer: spawnTimer + ENEMY_SPAWN_INTERVAL * (0.6 + Math.random()),
  };
};

const moveEnemies: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "TIME") {
    return {
      ...state,
      enemies: state.enemies
        .map((enemy) => ({ ...enemy, y: enemy.y + ENEMY_SPEED * event.delta }))
        .filter((enemy) => enemy.y < CANVAS_HEIGHT + ENEMY_RADIUS),
    };
  }
};

// Bullet/enemy hits pay score and remove both; each is worth at most one
// bullet per tick (a bullet can't hit two enemies at once, matching the
// visual of one shot punching through)
const resolveHits: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag !== "TIME") return;

  const hitBulletIds = new Set<number>();
  const hitEnemyIds = new Set<number>();

  for (const enemy of state.enemies) {
    if (hitEnemyIds.has(enemy.id)) continue;

    const bullet = state.bullets.find(
      (b) => !hitBulletIds.has(b.id) && distance(b, enemy) < BULLET_RADIUS + ENEMY_RADIUS
    );

    if (bullet !== undefined) {
      hitBulletIds.add(bullet.id);
      hitEnemyIds.add(enemy.id);
    }
  }

  if (hitEnemyIds.size === 0) return;

  return {
    ...state,
    score: state.score + hitEnemyIds.size,
    bullets: state.bullets.filter((b) => !hitBulletIds.has(b.id)),
    enemies: state.enemies.filter((e) => !hitEnemyIds.has(e.id)),
  };
};

const resolveShipCollision: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag !== "TIME") return;

  const hit = state.enemies.some((enemy) => distance(enemy, state.ship) < ENEMY_RADIUS + SHIP_RADIUS);

  if (hit) {
    return { ...state, gameOver: true };
  }
};

// Runs the engine — no raw DOM listeners needed, mouseButton above is
// the engine's own tool for "is the button currently held".
Yuuna.runEngine<GameState>({
  initialState,
  render,
  nextState: [
    freezeOnGameOver,
    followMouse,
    fireBullets,
    moveBullets,
    spawnEnemies,
    moveEnemies,
    resolveHits,
    resolveShipCollision,
  ],

  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831" },
});
