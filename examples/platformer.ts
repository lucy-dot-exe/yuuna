// Platformer — move with the arrow keys, jump with Space, and the camera
// follows you down a map wider than the canvas. No objective, no
// enemies: just a character, gravity, and a tile map to land on.

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

const TILE_SIZE = 45; // pixels per tile, in both directions

// The map itself — each character is one tile, read left-to-right, top-
// to-bottom: 🟫 is solid ground, 🟩 a solid platform, a space is open
// air. Both solid tiles are landed on identically; the difference
// between them is purely cosmetic.
const MAP = `\
                                                  
                                                  
                                                  
                                                  
                                                  
                                                  
             🟩🟩🟩🟩          🟩🟩🟩🟩          🟩🟩🟩🟩     
                                                  
      🟩🟩🟩🟩          🟩🟩🟩🟩          🟩🟩🟩🟩            
                                                  
                                                  
🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫🟫`;

// [...row] instead of row[i]/row.length — most emoji (these tiles
// included) are two UTF-16 code units, which plain string indexing would
// otherwise split in the middle of
const MAP_ROWS = MAP.split("\n").map((row) => [...row]);
const WORLD_WIDTH = Math.max(...MAP_ROWS.map((row) => row.length)) * TILE_SIZE;
const GROUND_Y = (MAP_ROWS.length - 1) * TILE_SIZE; // the map's bottom row

// Every solid tile's position and glyph, read once out of MAP_ROWS above
// — both what render() draws and what the character can land on
type Tile = { x: number; y: number; emoji: string };
const TILES: Tile[] = MAP_ROWS.flatMap((row, rowIndex) =>
  row.flatMap((emoji, colIndex) =>
    emoji === " " ? [] : [{ x: colIndex * TILE_SIZE, y: rowIndex * TILE_SIZE, emoji }]
  )
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

const CHARACTER_WIDTH = 32;
const CHARACTER_HEIGHT = 48;

// Create a type for the state of your game
type GameState = { x: number; y: number; velocityY: number; isGrounded: boolean };

// Create the initial state — standing on the ground, near the left edge
const initialState: GameState = {
  x: TILE_SIZE * 2,
  y: GROUND_Y - CHARACTER_HEIGHT,
  velocityY: 0,
  isGrounded: true,
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
  return {
    renderables: [
      ...TILES.map((tile) =>
        Yuuna.text({
          text: tile.emoji,
          color: "white", // ignored by color emoji, but TEXT requires it
          fontSize: TILE_SIZE,
          position: { x: tile.x, y: tile.y },
        })
      ),

      Yuuna.rectangle({
        color: "#e0a458",
        position: { x: state.x, y: state.y },
        size: { width: CHARACTER_WIDTH, height: CHARACTER_HEIGHT },
      }),

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
  if (keyboard.ArrowLeft.isPressed) x -= MOVE_SPEED * delta;
  if (keyboard.ArrowRight.isPressed) x += MOVE_SPEED * delta;
  x = Math.min(WORLD_WIDTH - CHARACTER_WIDTH, Math.max(0, x));

  // Jumping replaces whatever vertical velocity gravity had built up;
  // otherwise gravity just keeps accelerating the fall (or the rise, right
  // after a jump, until it wins out)
  const velocityY =
    state.isGrounded && keyboard.Space.isJustPressed ? JUMP_VELOCITY : state.velocityY + GRAVITY * delta;

  const newY = state.y + velocityY * delta;
  const landing = landingTileFor(state.y, newY, x);

  if (landing !== undefined) {
    return { x, y: landing.y - CHARACTER_HEIGHT, velocityY: 0, isGrounded: true };
  }

  return { x, y: newY, velocityY, isGrounded: false };
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
  camera: (state) => ({
    x: Math.min(WORLD_WIDTH - CANVAS_WIDTH, Math.max(0, state.x - CANVAS_WIDTH / 2 + CHARACTER_WIDTH / 2)),
    y: 0,
    zoom: 1,
  }),
});
