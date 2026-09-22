// Shoot Em Up — the ship follows your mouse, hold the mouse button down to
// fire, random enemies fall from the top and end the run on contact

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 600;

// Shared by every sprite below except the starfield (its own tiling below
// wants a size that divides the canvas width evenly, unrelated to this)
const SCALE = 2;

const SHIP_FRAME_SIZE = 16; // native pixels, before SCALE
const SHIP_RADIUS = (SHIP_FRAME_SIZE * SCALE) / 2;

const BEAM_FRAME_WIDTH = 8; // native pixels, before SCALE
const BEAM_FRAME_HEIGHT = 16;
const BULLET_RADIUS = (BEAM_FRAME_WIDTH * SCALE) / 2;
const BULLET_SPEED = 0.6; // pixels per millisecond
const FIRE_INTERVAL = 220; // milliseconds between shots while held down

const ALAN_FRAME_SIZE = 16; // native pixels, before SCALE
const ENEMY_RADIUS = (ALAN_FRAME_SIZE * SCALE) / 2;
const ENEMY_SPEED = 0.12; // pixels per millisecond
const ENEMY_SPAWN_INTERVAL = 700; // milliseconds, randomized a bit per spawn

// The starfield tiles both directions: sideways to fill the canvas width
// (there's no horizontal scroll, just enough copies to cover it), and
// vertically as two layers scrolling at different speeds past each other
// for a parallax depth effect — see starLayer below.
const STAR_NATIVE_WIDTH = 128;
const STAR_NATIVE_HEIGHT = 64;
const STAR_SCALE = 2.5; // 320px wide — 960 / 320 = 3 columns, exactly
const STAR_TILE_WIDTH = STAR_NATIVE_WIDTH * STAR_SCALE;
const STAR_TILE_HEIGHT = STAR_NATIVE_HEIGHT * STAR_SCALE;
const STAR_COLUMNS = Math.ceil(CANVAS_WIDTH / STAR_TILE_WIDTH);
const STAR_ROWS = Math.ceil(CANVAS_HEIGHT / STAR_TILE_HEIGHT) + 1; // +1 to cover the scroll wrap

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
  elapsed: number; // drives the starfield's scroll — see advanceTime/starLayer
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
  elapsed: 0,
};

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Every position in state (ship/bullets/enemies) is a center, matching
// the circle hit-testing distance() above already assumes — SPRITE's own
// position is a top-left corner instead, so this is the one conversion
// point between the two, given a sprite's full display width/height
const topLeftOf = (center: { x: number; y: number }, width: number, height: number) => ({
  x: center.x - width / 2,
  y: center.y - height / 2,
});

// Two copies of the same starfield, scrolling downward at different
// speeds — the faster, fully-opaque one reads as closer, the slower,
// dimmer one as further away
const starLayer = (elapsed: number, speed: number, opacity: number): Renderable[] => {
  // Rounded to a whole pixel — elapsed*speed is essentially never an
  // integer, and with pixel art's smoothing disabled, tiles stacked at a
  // fractional y can leave a 1px seam where two of them don't quite meet
  // (same fix as the Platformer's parallax background).
  const offsetY = Math.round((elapsed * speed) % STAR_TILE_HEIGHT);

  const tiles: Renderable[] = [];
  for (let row = 0; row < STAR_ROWS; row++) {
    for (let col = 0; col < STAR_COLUMNS; col++) {
      tiles.push(
        Yuuna.sprite({
          resourceId: "starfield",
          opacity,
          scale: { x: STAR_SCALE, y: STAR_SCALE },
          position: { x: col * STAR_TILE_WIDTH, y: row * STAR_TILE_HEIGHT - STAR_TILE_HEIGHT + offsetY },
        })
      );
    }
  }
  return tiles;
};

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { cursor?: "none"; renderables: Renderable[] };
const render: RenderFunction = (state) => {
  const renderables: Renderable[] = [
    ...starLayer(state.elapsed, 0.03, 0.5), // far layer: slow, dim
    ...starLayer(state.elapsed, 0.08, 1), // near layer: fast, full brightness

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
      Yuuna.animatedSprite({
        id: `enemy-${enemy.id}`,
        resourceId: "alan",
        animation: "idle",
        scale: { x: SCALE, y: SCALE },
        position: topLeftOf(enemy, ALAN_FRAME_SIZE * SCALE, ALAN_FRAME_SIZE * SCALE),
      })
    ),

    ...state.bullets.map((bullet) =>
      Yuuna.sprite({
        resourceId: "beam",
        frame: 2, // the charged (not still-charging) pose — see the resource comment below
        scale: { x: SCALE, y: SCALE },
        position: topLeftOf(bullet, BEAM_FRAME_WIDTH * SCALE, BEAM_FRAME_HEIGHT * SCALE),
      })
    ),

    Yuuna.sprite({
      resourceId: "ship",
      frame: 1, // the middle of its three frames
      scale: { x: SCALE, y: SCALE },
      position: topLeftOf(state.ship, SHIP_FRAME_SIZE * SCALE, SHIP_FRAME_SIZE * SCALE),
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

const advanceTime: NextStateFunction<GameState> = ({ state, event }) => {
  if (event.tag === "TIME") {
    return { ...state, elapsed: state.elapsed + event.delta };
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
    advanceTime,
    followMouse,
    fireBullets,
    moveBullets,
    spawnEnemies,
    moveEnemies,
    resolveHits,
    resolveShipCollision,
  ],

  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831" },

  // Ship, beam, Alan, and the starfield: Mini Pixel Pack 3 by GrafxKid —
  // https://grafxkid.itch.io/mini-pixel-pack-3
  resources: {
    ship: {
      src: "./resources/mini-pixel-pack-3/ship.png",
      size: { width: SHIP_FRAME_SIZE * 3, height: SHIP_FRAME_SIZE },
      slices: { horizontal: 3, vertical: 1 },
    },
    // 4 frames: 0-1 are the beam charging up, 2-3 are it fully charged —
    // render() above always shows frame 2, the charged pose, as the shot
    beam: {
      src: "./resources/mini-pixel-pack-3/beam.png",
      size: { width: BEAM_FRAME_WIDTH * 4, height: BEAM_FRAME_HEIGHT },
      slices: { horizontal: 4, vertical: 1 },
    },
    alan: {
      src: "./resources/mini-pixel-pack-3/alan.png",
      size: { width: ALAN_FRAME_SIZE * 6, height: ALAN_FRAME_SIZE },
      slices: { horizontal: 6, vertical: 1 },
      animations: {
        idle: {
          frames: [0, 1, 2, 3, 4, 5],
          frameDuration: 150,
          loop: true,
        },
      },
    },
    starfield: {
      src: "./resources/mini-pixel-pack-3/starfield.png",
      size: { width: STAR_NATIVE_WIDTH, height: STAR_NATIVE_HEIGHT },
    },
  },
});
