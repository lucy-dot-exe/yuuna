// Platformer — move with the arrow keys, jump with Space, and the camera
// follows you down a map wider than the canvas. No objective, no
// enemies: just a character, gravity, and a tile map to land on.

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 576;

const NATIVE_TILE_SIZE = 16; // tile.png's own resolution, before SCALE
const SCALE = 3; // shared by every sprite below (tiles and the fox alike)
const TILE_SIZE = NATIVE_TILE_SIZE * SCALE; // pixels per tile, in both directions

// The map itself — each character is one tile, read left-to-right, top-
// to-bottom: # is a solid tile (ground and platforms alike — there's
// only one tile texture, see the `tile` resource below, so nothing
// distinguishes them beyond the level design read here in the source),
// a space is open air.
const MAP = `\






             ####          ####          ####

      ####          ####          ####


##################################################`;

const MAP_ROWS = MAP.split("\n").map((row) => [...row]);
const WORLD_WIDTH = Math.max(...MAP_ROWS.map((row) => row.length)) * TILE_SIZE;
const GROUND_Y = (MAP_ROWS.length - 1) * TILE_SIZE; // the map's bottom row

// Every solid tile's position, read once out of MAP_ROWS above — both
// what render() draws and what the character can land on. One array
// entry per non-space character in MAP, so one map character is always
// exactly one tile here — nothing merges/splits runs of them.
type Tile = { x: number; y: number };
const TILES: Tile[] = MAP_ROWS.flatMap((row, rowIndex) =>
  row.flatMap((cell, colIndex) => (cell === " " ? [] : [{ x: colIndex * TILE_SIZE, y: rowIndex * TILE_SIZE }]))
);

// Converts a tiles-per-second velocity into the pixels-per-millisecond
// one, matching the units a TIME event's own `delta` is in — one factor
// of 1000 to go from "per second" to "per millisecond"
const perMs = (tilesPerSecond: number) => (tilesPerSecond * TILE_SIZE) / 1000;

// Same, but for an acceleration (tiles-per-second, squared): time appears
// squared in the units, so this needs 1000² — using perMs's single 1000
// here would leave gravity acting 1000x too strong
const perMs2 = (tilesPerSecondSquared: number) => (tilesPerSecondSquared * TILE_SIZE) / 1_000_000;

const MOVE_SPEED = perMs(6); // 6 tiles/second
const GRAVITY = perMs2(55); // 55 tiles/second, squared
const JUMP_VELOCITY = -perMs(18); // 18 tiles/second, upward

// The fox's own frame size, before SCALE — every sheet below shares it
const FOX_FRAME_WIDTH = 33;
const FOX_FRAME_HEIGHT = 32;
const CHARACTER_WIDTH = FOX_FRAME_WIDTH * SCALE;
const CHARACTER_HEIGHT = FOX_FRAME_HEIGHT * SCALE;

// Shared by the `camera` prop and the background's parallax below, so the
// two can never drift out of sync with each other
const cameraXFor = (state: { x: number }) =>
  Math.min(WORLD_WIDTH - CANVAS_WIDTH, Math.max(0, state.x - CANVAS_WIDTH / 2 + CHARACTER_WIDTH / 2));

// The background scrolls at a fraction of the camera's own speed (the
// classic parallax trick, distant scenery moving slower than the
// foreground implies it's further away) — scaled so one copy is exactly
// one canvas-width wide, which keeps the tiling math below to just
// "three copies, offset by the scroll position wrapped to that width".
const BACKGROUND_NATIVE_WIDTH = 384;
const BACKGROUND_NATIVE_HEIGHT = 240;
const BACKGROUND_SCALE = CANVAS_WIDTH / BACKGROUND_NATIVE_WIDTH;
const BACKGROUND_WIDTH = BACKGROUND_NATIVE_WIDTH * BACKGROUND_SCALE; // === CANVAS_WIDTH
const PARALLAX_FACTOR = 0.3;

// Create a type for the state of your game
type GameState = {
  x: number;
  y: number;
  velocityY: number;
  isGrounded: boolean;
  isMoving: boolean; // walking left/right this frame — idle vs. walk cycle
  facingLeft: boolean; // mirrors the (right-facing) walk/idle art when true
};

// Create the initial state — standing on the ground, near the left edge
const initialState: GameState = {
  x: TILE_SIZE * 2,
  y: GROUND_Y - CHARACTER_HEIGHT,
  velocityY: 0,
  isGrounded: true,
  isMoving: false,
  facingLeft: false,
};

// The tile (if any) the character would land on this frame: the highest
// one (smallest y) it overlaps horizontally, whose top it was at or
// above before this frame and is at or below after it — i.e. whichever
// one its feet just fell through
const landingTileFor = (oldY: number, newY: number, x: number): Tile | undefined =>
  TILES.filter(
    (tile) =>
      x + CHARACTER_WIDTH > tile.x &&
      x < tile.x + TILE_SIZE &&
      oldY + CHARACTER_HEIGHT <= tile.y &&
      newY + CHARACTER_HEIGHT >= tile.y
  ).sort((a, b) => a.y - b.y)[0];

// Create a function that renders the game, based on the state
type RenderFunction = (state: GameState) => { renderables: Renderable[] };
const render: RenderFunction = (state) => {
  // Airborne: the jump sheet's rising pose while still moving up
  // (negative velocityY), its falling pose once gravity's winning —
  // flipped for a leftward facing, same as idle/walk below (all three
  // sheets are drawn facing right).
  const character = !state.isGrounded
    ? Yuuna.sprite({
        resourceId: "fox-jump",
        frame: state.velocityY < 0 ? 0 : 1,
        flipX: state.facingLeft,
        scale: { x: SCALE, y: SCALE },
        position: { x: state.x, y: state.y },
      })
    : state.isMoving
    ? Yuuna.animatedSprite({
        id: "fox-walk",
        resourceId: "fox-walk",
        animation: "walk",
        flipX: state.facingLeft,
        scale: { x: SCALE, y: SCALE },
        position: { x: state.x, y: state.y },
      })
    : Yuuna.animatedSprite({
        id: "fox-idle",
        resourceId: "fox-idle",
        animation: "idle",
        flipX: state.facingLeft,
        scale: { x: SCALE, y: SCALE },
        position: { x: state.x, y: state.y },
      });

  // Wrapped into [0, BACKGROUND_WIDTH) — how far the background has
  // scrolled, offset by the parallax fraction of how far the camera has.
  // Rounded to a whole pixel: CHARACTER_WIDTH (and so cameraXFor's own
  // centering math) isn't a whole number, and with pixel art's
  // smoothing disabled, three copies placed edge to edge at fractional
  // positions can leave a 1px seam between them where they don't quite
  // meet — rounding keeps every copy's edges landing on the same pixel.
  const parallaxOffset = Math.round(
    (((cameraXFor(state) * PARALLAX_FACTOR) % BACKGROUND_WIDTH) + BACKGROUND_WIDTH) % BACKGROUND_WIDTH
  );

  return {
    renderables: [
      // Three copies (one screen-width each) offset by that scroll
      // position — enough to always cover the canvas edge to edge no
      // matter where the wrapped offset lands. screenSpace (so panning
      // it is this loop's job, not the camera's) plus a layer behind
      // every world-space renderable's default 0 is what puts it back
      // behind the tiles/character despite being screen-space itself —
      // world-space and screen-space renderables would otherwise always
      // draw as two separate, layer-blind groups (world first).
      ...[-1, 0, 1].map((i) =>
        Yuuna.sprite({
          resourceId: "background",
          screenSpace: true,
          layer: -100,
          scale: { x: BACKGROUND_SCALE, y: BACKGROUND_SCALE },
          position: { x: i * BACKGROUND_WIDTH - parallaxOffset, y: 0 },
        })
      ),

      ...TILES.map((tile) =>
        Yuuna.sprite({
          resourceId: "tile",
          scale: { x: SCALE, y: SCALE },
          position: { x: tile.x, y: tile.y },
        })
      ),

      character,

      // Top-left, fixed on screen (screenSpace) so it doesn't pan away
      // with the world as the camera follows the character below
      Yuuna.text({
        screenSpace: true,
        text: "Arrow keys to move, Space to jump",
        color: "#8899aa",
        position: { x: 10, y: 20 },
      }),
    ],
  };
};

// Create a function that handles the game state
// NextStateFunction<State> comes from the engine — its props also include
// `playSound`/`playMusic`/`pauseMusic`, unused here
const nextState: NextStateFunction<GameState> = ({ state, event, keyboard }) => {
  if (event.tag !== "TIME") {
    return state;
  }

  const { delta } = event;

  let x = state.x;
  let facingLeft = state.facingLeft;
  let isMoving = false;

  if (keyboard.ArrowLeft.isPressed) {
    x -= MOVE_SPEED * delta;
    facingLeft = true;
    isMoving = true;
  }
  if (keyboard.ArrowRight.isPressed) {
    x += MOVE_SPEED * delta;
    facingLeft = false;
    isMoving = true;
  }
  x = Math.min(WORLD_WIDTH - CHARACTER_WIDTH, Math.max(0, x));

  // Jumping replaces whatever vertical velocity gravity had built up;
  // otherwise gravity just keeps accelerating the fall (or the rise, right
  // after a jump, until it wins out)
  const velocityY =
    state.isGrounded && keyboard.Space.isJustPressed ? JUMP_VELOCITY : state.velocityY + GRAVITY * delta;

  const newY = state.y + velocityY * delta;
  const landing = landingTileFor(state.y, newY, x);

  if (landing !== undefined) {
    return { x, y: landing.y - CHARACTER_HEIGHT, velocityY: 0, isGrounded: true, isMoving, facingLeft };
  }

  return { x, y: newY, velocityY, isGrounded: false, isMoving, facingLeft };
};

// Runs the engine
Yuuna.runEngine<GameState>({
  initialState,
  nextState,
  render,

  canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: "#0d1831" },

  // Keeps the character centered horizontally, clamped so the view never
  // scrolls past either edge of the world; the vertical position is fixed
  // since the whole map's height already fits on screen at once
  camera: (state) => ({ x: cameraXFor(state), y: 0, zoom: 1 }),

  // Fox, tile, and background art: Sunny Land Pixel Game Art by ansimuz
  // — https://ansimuz.itch.io/sunny-land-pixel-game-art
  resources: {
    background: {
      src: "./resources/sunnyland/background.png",
      size: { width: BACKGROUND_NATIVE_WIDTH, height: BACKGROUND_NATIVE_HEIGHT },
    },
    "fox-idle": {
      src: "./resources/sunnyland/fox-idle.png",
      size: { width: FOX_FRAME_WIDTH * 4, height: FOX_FRAME_HEIGHT },
      slices: { horizontal: 4, vertical: 1 },
      animations: {
        idle: {
          frames: [0, 1, 2, 3],
          frameDuration: 180,
          loop: true,
        },
      },
    },
    "fox-walk": {
      src: "./resources/sunnyland/fox-walk.png",
      size: { width: FOX_FRAME_WIDTH * 6, height: FOX_FRAME_HEIGHT },
      slices: { horizontal: 6, vertical: 1 },
      animations: {
        walk: {
          frames: [0, 1, 2, 3, 4, 5],
          frameDuration: 90,
          loop: true,
        },
      },
    },
    "fox-jump": {
      src: "./resources/sunnyland/fox-jump.png",
      size: { width: FOX_FRAME_WIDTH * 2, height: FOX_FRAME_HEIGHT },
      slices: { horizontal: 2, vertical: 1 }, // frame 0 rising, frame 1 falling
    },
    tile: {
      src: "./resources/sunnyland/tile.png",
      size: { width: NATIVE_TILE_SIZE, height: NATIVE_TILE_SIZE },
    },
  },
});
