// Common Tetris type definitions
export {Viewport, Constants, Block, shapes, shapesKeys, colours, rightWallKick, irightWallKick, leftWallKick, ileftWallKick}
export type { Key, Event, State, Action, Tetromino, Cube, OptionalCube, Row, Position, Test }

const Viewport = {
    CANVAS_WIDTH: 200,
    CANVAS_HEIGHT: 400,
    PREVIEW_WIDTH: 160,
    PREVIEW_HEIGHT: 80,
  } as const;
  
const Constants = {
    TICK_RATE_MS: 40,
    GRID_WIDTH: 10,
    GRID_HEIGHT: 20,
} as const;

const Block = {
    WIDTH: (Viewport.CANVAS_WIDTH / Constants.GRID_WIDTH),
    HEIGHT: (Viewport.CANVAS_HEIGHT / Constants.GRID_HEIGHT),
};

/** The positional offsets of the four blocks from a central point for each of the seven tetromino shape
* See here for rotation system implemented: https://tetris.fandom.com/wiki/SRS?file=SRS-pieces.png
*
*   I:    ---- 
*
*   O:    --
*         --
*
*   T:    -
*        ---
*
*   J:   -
*        ---
*
*   L:     -
*        ---
*
*   S:   --
*       --
*
*   Z:  --
*        --
*/
const shapes: Record<string, ReadonlyArray<Position>> = {
    I: [{x: -2, y: -1}, {x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}],
    O: [{x: -1, y: -1}, {x: -1, y: 0}, {x: 0, y: -1}, {x: 0, y: 0}],
    T: [{x: -1, y: 0}, {x: 0, y: 0}, {x: 0, y: -1}, {x: 1, y: 0}],
    J: [{x: -1, y: -1}, {x: -1, y: 0}, {x: 0, y: 0}, {x: 1, y: 0}],
    L: [{x: -1, y: 0}, {x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: -1}],
    S: [{x: -1, y: 0}, {x: 0, y: 0}, {x: 0, y: -1}, {x: 1, y: -1}],
    Z: [{x: -1, y: -1}, {x: 0, y: -1}, {x: 0, y: 0}, {x: 1, y: 0}]
} as const
const shapesKeys = Object.keys(shapes);

/**
 * Block colours.
 * See here for list of available block colours: https://www.w3.org/wiki/CSS/Properties/color/keywords
 */
const colours = ["goldenrod", "red", "mediumpurple", "fuchsia", "springgreen", "lime", "yellow", "aqua", "crimson"] as const

/**
 * Wall kick data.
 * See here for the wallkick tests: https://tetris.fandom.com/wiki/SRS
 */
type WallKickTests = ReadonlyArray<ReadonlyArray<number>>

// General ("J", "L", "T", "S", "Z") wallkicks
const rightWallKick: Record<number, WallKickTests> = {
    0: [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    1: [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    2: [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]] ,
    3: [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]] ,
} as const

const leftWallKick: Record<number, WallKickTests> = {
    0: [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]] ,
    1: [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]] ,
    2: [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]] ,
    3: [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]] ,
} as const

// "I" wallkicks 
const irightWallKick: Record<number, WallKickTests> = {
    0: [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]] ,
    1: [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]] ,
    2: [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]] ,
    3: [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]] ,
} as const

const ileftWallKick: Record<number, WallKickTests> = {
    0: [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]] ,
    1: [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]] ,
    2: [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]] ,
    3: [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]] ,
} as const

/** A string literal type for each key used in game control */
type Key = "KeyS" | "KeyA" | "KeyD" | "KeyR" | "Space" | "KeyE" | "KeyQ";

/** Only input event is keypress */
type Event = "keypress";

/** The game board contains either the cube piece or nothing in each cell */
type OptionalCube = Cube | null

type Row = ReadonlyArray<OptionalCube>

/** Tetromino blocks are composed of cubes */
interface Cube {
    colour: typeof colours[number],
    x: number,
    y: number,
    id: string
}

interface Position {
    x: number, 
    y: number
}

interface Test {
    isTestX: boolean,
    isTestY: boolean
}

/** The game object that the player controls */
interface Tetromino {
    id: number,
    rotation: number,
    shape: keyof typeof shapes,
    colour: typeof colours[number],
    position: {x: number, y: number},
    blocks: ReadonlyArray<Cube>
}

/** Game state */
interface State {
    curTetromino: Tetromino,
    nextTetromino: Tetromino,
    ghostTetromino: Tetromino 
    curLevel: number,
    prevLevel: number,
    score: number,
    highscore: number,
    tetroCreated: number,
    rowsCleared: number,
    randNum: number,
    gameOver: boolean,
    board: ReadonlyArray<Row>,
    exitBoard: ReadonlyArray<Cube>,
    exitPreview: ReadonlyArray<Cube> | null,
    allBlocksCreated: ReadonlyArray<Cube>
    tickCounter: number
  };

/** Actions modify state */
interface Action {
    apply(s: State): State;
}