export { initialState, Left, Right, Down, Tick, reduceState, Restart, RotateRight, Drop, RotateLeft }
import { Action, State, Tetromino, Cube, Row, OptionalCube, Position, Test } from './types'                                        
import { Constants, shapes, shapesKeys, colours, rightWallKick, irightWallKick, leftWallKick, ileftWallKick } from './types'         
import { isNotNullOrUndefined, not } from './util' 

//////////////////////////////////// INITIAL STATE SET UP ////////////////////////////////////
const
    startX = Math.floor(Constants.GRID_WIDTH/2),
    startY = -1,
    createGameBoard = () => 
        Array.from({length: Constants.GRID_HEIGHT}, 
                (row) => Array.from({length: Constants.GRID_WIDTH}, 
                    (cell) => null));

const createTetromino = 
    (shape: keyof typeof shapes, 
    pivotX: number, pivotY: number, 
    id: number, 
    colour: typeof colours[number], 
    rotation: keyof typeof rightWallKick): Tetromino => 
    ({
            position: {x: pivotX, y: pivotY},
            id,
            shape,
            colour,
            rotation,
            blocks: shapes[shape].map(({x, y}, idx) => ({
                    colour, 
                    x: x + pivotX, 
                    y: y + pivotY, 
                    id: String(id) + "tetro" + idx
                }))
            }
)

const initialState: State = {  
    curTetromino: createTetromino("I", startX, startY, 0, colours[0], 0),        // Hardcode initial blocks
    nextTetromino: createTetromino("S", startX, startY, 1, colours[3], 0),
    ghostTetromino: createTetromino("I", startX, startY, -1, colours[0], 0), 

    curLevel: 1,
    prevLevel: 1,
    score: 0,
    highscore: 0,
    rowsCleared: 0,
    tetroCreated: 1,
    randNum: 0,

    gameOver: false, 
    board: createGameBoard(),

    exitBoard: [],
    exitPreview: null,
    allBlocksCreated: [],

    tickCounter: 0
} as const;

//////////////////////////////////// CREATION OF GAME OBJECTS ////////////////////////////////////
const updatedTetro = ({x: xOffset, y: yOffset}: Position) => 
    (t: Tetromino): Tetromino =>
    ({
        ...t,
        position: {x: t.position.x + xOffset, y: t.position.y + yOffset},
        blocks: t.blocks.map((b) => ({
            ...b, 
            x: b.x + xOffset, 
            y: b.y + yOffset, 
            }))
    })
const
    downGhostTetro = updatedTetro({x: 0, y: 1}),
    leftGhostTetro = updatedTetro({x: -1, y: 0}),
    rightGhostTetro = updatedTetro({x: 1, y: 0}); 

const setBoardCell = (
    oldBoard: ReadonlyArray<Row>, 
    rowIdx: number, 
    colIdx: number, 
    newValue: OptionalCube): ReadonlyArray<Row> => {
        const 
            row = oldBoard[rowIdx],
            newRow = [...row.slice(0, colIdx), newValue, ...row.slice(colIdx+1, row.length)];

        return [...oldBoard.slice(0, rowIdx), newRow, ...oldBoard.slice(rowIdx+1, oldBoard.length)]
}

const randTetro = (rnd: number) => (tetroCreated: number) => {
    const 
        randShape = shapesKeys[Math.floor(rnd * (shapesKeys.length))],
        randColour = colours[Math.floor(rnd * (colours.length))];

    return createTetromino(
        randShape, 
        startX, 
        startY, 
        tetroCreated, 
        randColour,
        0
    )
}

/** A ghost tetromino shows the current landing position of the falling tetromino */
const createGhostTetro = (board: ReadonlyArray<Row>) => (t: Tetromino): Tetromino => {

    // Create a ghost tetromino for each height in the board
    // Find the first tetromino that results in a collision from top to bottom
    // Use the y position of that tetromino to find the first instance where there is NOT a collision from bottom to top
    // The result is the ghost tetris
    const isCollision = (ghost: Tetromino): boolean => overlapStack(board)(ghost) || beyondBottomBorder(ghost)
    const 
        downTetros = Array.from({length: Constants.GRID_HEIGHT + 1}, 
                    (_, i) => i)
                    .map( (yOffset) => updatedTetro({x: 0, y: yOffset})(t) ),

        overlapTetro = downTetros.find(isCollision),

        collideY = isNotNullOrUndefined(overlapTetro) 
                    ? overlapTetro.position.y 
                    : t.position.y,

        upTetros = Array.from({length: collideY - 1}, 
                    (_, i) => collideY - t.position.y - i)
                    .map( (yOffset) => updatedTetro({x: 0, y: yOffset})(t) ),

        ghostTetro = upTetros.find(not(isCollision))

    return isNotNullOrUndefined(ghostTetro) 
            ? {...ghostTetro, blocks: ghostTetro.blocks.map( (b) => ({...b, id: "g" + b.id}) )} 
            : t
}

//////////////////////////////////// COLLISION DETECTION ////////////////////////////////////
/** Apply a test on all blocks of a tetromino piece */
const testTetroBlocks = (test: (_: number) => boolean) =>
        ({isTestX, isTestY}: Test) => 
                (t: Tetromino) =>
            {
                const
                    blocksXPos: ReadonlyArray<number> = t.blocks.map( ({x}) => x),
                    blocksYPos: ReadonlyArray<number> = t.blocks.map( ({y}) => y),
                    testX = blocksXPos.some(test),
                    testY = blocksYPos.some(test);
                
                return (isTestX ? testX : true) && (isTestY ? testY : true);
            }
const 
    isBottomGrid = testTetroBlocks( (b) => b >= (Constants.GRID_HEIGHT-1) )
                                  ({isTestX: false, isTestY: true}),

    beyondLeftBorder = testTetroBlocks((x: number) => x < 0)
                                      ({isTestX: true, isTestY: false}),

    beyondRightBorder = testTetroBlocks((x: number) => x > Constants.GRID_WIDTH-1)
                                       ({isTestX: true, isTestY: false}),

    beyondBottomBorder = testTetroBlocks((y: number) => y > Constants.GRID_HEIGHT-1)
                                        ({isTestX: false, isTestY: true}),

    beyondTopBorder = testTetroBlocks((y: number) => y < 0)
                                     ({isTestX: false, isTestY: true});

/** Check if any blocks of the tetrimo piece overlap with the stack */
const overlapStack = (board: ReadonlyArray<Row>) => (t: Tetromino) => {
    const tetroBlockPos = 
        t.blocks.map(({x, y}) => [x,y])
        .filter(([x, y]) => 
        !(x < 0 || x >= Constants.GRID_WIDTH || y >= Constants.GRID_HEIGHT || y < 0)         // Remove the x and y values outside the grid
        )      
    const isCollideStack = ([x, y]: ReadonlyArray<number>): boolean => Boolean(board[y][x])

    return tetroBlockPos.some(isCollideStack)
}

//////////////////////////////////// STATE UPDATES ////////////////////////////////////
class Restart implements Action {
    /**
     * Remove all blocks and reset all counters except highscore
     * 
     * @param s Previous state
     * @returns New state
     */
    apply = (s: State): State => {
        if (!s.gameOver) {return s}

        const
            newTetro = randTetro(s.randNum)(0),
            newNextTetro = randTetro((s.randNum + 0.5) % 1)(1),
            newGameBoard = createGameBoard();

        return {
            ...s,
            curTetromino: newTetro,
            nextTetromino: newNextTetro,
            ghostTetromino: createGhostTetro(newGameBoard)(newTetro),

            curLevel: 1,
            prevLevel: 0,
            score: 0,
            tetroCreated: 1,
            rowsCleared: 0,

            gameOver: false,
            board: newGameBoard,  

            exitBoard: [],
            allBlocksCreated: []
        }
    }
}

class Drop implements Action {
    /**
     * Drop the falling tetromino to its landing position
     * 
     * @param s Previous state
     * @returns New state
     */
    apply = (s: State): State => {
        const 
            {x: xGhost, y: yGhost} = s.ghostTetromino.position,
            {x: xCur, y: yCur} = s.curTetromino.position

        return {
            ...s,
            curTetromino: updatedTetro({x: xGhost - xCur, y: yGhost - yCur})(s.curTetromino)
        }
    }
}

class RotateRight implements Action {
    /**
     * Rotate the tetromino clockwise if possible
     * 
     * @param s Previous state
     * @returns New state
     */
    apply = (s: State): State => {
        const
            { shape: curShape, rotation: curRotation } = s.curTetromino
        
        if (curShape === "O") {return s}     // No rotation for "O" blocks

        const 
            isValidTetro = (t: Tetromino): boolean => 
                !(beyondLeftBorder(t) 
                || beyondRightBorder(t) 
                || overlapStack(s.board)(t) 
                || beyondTopBorder(t) 
                || beyondBottomBorder(t)),

            switchCoord = (x: number, y: number) => ({x: -y, y: x}),
            
            rotateBlockPosition = (pivotX: number, pivotY: number) => (c: Cube): Cube => {
                // The given X & Y pivot of the "I" block is not the actual pivot.
                // So we just fix this by subtracting 0.5 to get the actual pivot point. 
                const {x: newX, y: newY} = curShape === "I" 
                    ? switchCoord(c.x - (pivotX - 0.5), c.y - (pivotY - 0.5))               
                    : switchCoord(c.x - pivotX,         c.y - pivotY);
                
                return curShape === "I" 
                    ? {...c, x: newX + pivotX - 0.5, y: newY + pivotY - 0.5}
                    : {...c, x: newX + pivotX,       y: newY + pivotY};
            },

            rotateTetromino = (t: Tetromino): Tetromino => {
                const
                    {x: pivotX, y: pivotY} = t.position,
                    rotatedBlocks = t.blocks.map(rotateBlockPosition(pivotX, pivotY)),
                    newRotationState = (t.rotation + 1) % 4;
                
                return {...t, blocks: rotatedBlocks, rotation: newRotationState}
            },

            rotateOffsetTetromino = ({x, y} : Position): Tetromino => 
                rotateTetromino(updatedTetro({x, y})(s.curTetromino));

        const 
            // Use pretermined offset positions to determine if a wallkick rotate is possible
            // The "I" tetromino has a different wallkick test compared to the other tetrominos.
            validRotatedTetro = curShape !== "I" 
                ? rightWallKick[curRotation]
                    .find(([xOffset, yOffset]) => 
                        isValidTetro(rotateOffsetTetromino({x: xOffset, y: yOffset})))
                : irightWallKick[curRotation]
                    .find(([xOffset, yOffset]) => 
                        isValidTetro(rotateOffsetTetromino({x: xOffset, y: yOffset}))),

            updatedTetromino: Tetromino = isNotNullOrUndefined(validRotatedTetro) 
                ? rotateOffsetTetromino({x: validRotatedTetro[0], y: validRotatedTetro[1]})
                : s.curTetromino,

            newGhostTetro: Tetromino = createGhostTetro(s.board)(updatedTetromino);                                                                      


        return {
            ...s, 
            curTetromino: updatedTetromino,
            ghostTetromino: newGhostTetro,
            exitBoard: s.ghostTetromino.blocks,
            allBlocksCreated: s.allBlocksCreated.concat(newGhostTetro.blocks)
        }
    }
}

class RotateLeft implements Action {
    /**
     * Rotate the tetromino anticlockwise if possible
     * 
     * @param s Previous state
     * @returns New state
     */
    apply = (s: State): State => {
        const
            { shape: curShape, rotation: curRotation } = s.curTetromino
        
        if (curShape === "O") {return s}    // No rotation for "O" blocks
        
        const 
            isValidTetro = (t: Tetromino): boolean => 
                !(beyondLeftBorder(t) 
                || beyondRightBorder(t) 
                || overlapStack(s.board)(t) 
                || beyondTopBorder(t) 
                || beyondBottomBorder(t)),

            switchCoord = (x: number, y: number) => ({x: y, y: -x}),
            
            rotateBlockPosition = (pivotX: number, pivotY: number) => (c: Cube): Cube => {
                // Use offset positions to determine if a wallkick rotate is possible
                // The "I" block has a different wallkick test compared to the other
                // blocks
                const {x: newX, y: newY} = curShape === "I" 
                    ? switchCoord(c.x - (pivotX - 0.5), c.y - (pivotY - 0.5)) 
                    : switchCoord(c.x - pivotX,         c.y - pivotY);

                return curShape === "I" 
                    ? {...c, x: newX + pivotX - 0.5, y: newY + pivotY - 0.5}
                    : {...c, x: newX + pivotX, y: newY + pivotY};
            },

            rotateTetromino = (t: Tetromino): Tetromino => {
                const
                    {x: pivotX, y: pivotY} = t.position,
                    rotatedBlocks = t.blocks.map(rotateBlockPosition(pivotX, pivotY)),
                    newRotationState = (t.rotation - 1 + 4) % 4;
                
                return {...t, blocks: rotatedBlocks, rotation: newRotationState};
            },

            rotateOffsetTetromino = ({x, y} : Position): Tetromino => 
                rotateTetromino(updatedTetro({x, y})(s.curTetromino));

        const 
            // Use predetermined offset positions to determine if a wallkick rotate 
            // is possible. The "I" tetrominos has a different wallkick test compared to 
            // the other tetrominos.
            validRotatedTetro = curShape !== "I" 
                ? leftWallKick[curRotation]
                    .find(([xOffset, yOffset]) => 
                        isValidTetro(rotateOffsetTetromino({x: xOffset, y: yOffset})))
                : ileftWallKick[curRotation]
                    .find(([xOffset, yOffset]) => 
                        isValidTetro(rotateOffsetTetromino({x: xOffset, y: yOffset}))),

            updatedTetromino = isNotNullOrUndefined(validRotatedTetro) 
                ? rotateOffsetTetromino({x: validRotatedTetro[0], y: validRotatedTetro[1]})
                : s.curTetromino,

            newGhostTetro = createGhostTetro(s.board)(updatedTetromino); 

        return {
            ...s, 
            curTetromino: updatedTetromino,
            ghostTetromino: newGhostTetro,
            exitBoard: s.ghostTetromino.blocks,
            allBlocksCreated: s.allBlocksCreated.concat(newGhostTetro.blocks)
        }
    }
}

class Left implements Action { 
    /**
     * Move the tetromino left by one block space if possible
     * 
     * @param s Previous state
     * @returns New state
     */
    apply = (s: State): State => {
        if (s.gameOver) {return s}

        const 
            leftTetro = leftGhostTetro(s.curTetromino),
            cannotMoveLeft = beyondLeftBorder(leftTetro),                   
            isCollide = overlapStack(s.board)(leftTetro);                           

        const 
            updatedTetromino = cannotMoveLeft || isCollide ? s.curTetromino : leftTetro,
            newGhostTetro = createGhostTetro(s.board)(updatedTetromino);

        return {
        ...s,
        curTetromino: updatedTetromino,
        ghostTetromino: newGhostTetro,
        exitBoard: s.ghostTetromino.blocks,
        allBlocksCreated: s.allBlocksCreated.concat(newGhostTetro.blocks)
        }
    }
}

class Right implements Action { 
    /**
     * Move the tetromino right by one block space if possible
     * 
     * @param s Previous state
     * @returns New state
     */
    apply = (s: State) => {
        if (s.gameOver) {return s}

        const 
            rightTetro = rightGhostTetro(s.curTetromino),                                                
            cannotMoveRight = beyondRightBorder(rightTetro),              
            isCollide = overlapStack(s.board)(rightTetro);

        const 
            updatedTetromino = cannotMoveRight || isCollide ? s.curTetromino : rightTetro,
            newGhostTetro = createGhostTetro(s.board)(updatedTetromino);

        return {
        ...s,
        curTetromino: updatedTetromino,
        ghostTetromino: newGhostTetro,
        exitBoard: s.ghostTetromino.blocks,
        allBlocksCreated: s.allBlocksCreated.concat(newGhostTetro.blocks)                                          
        }
    }
}

class Down implements Action { 
    /**
     * Move the tetromino down by one block space if possible
     * 
     * @param s Previous state
     * @returns New state
     */
    apply = (s: State) => {
        if (s.gameOver) {return s}

        const downTetromino = downGhostTetro(s.curTetromino),
              cannotMoveDown = beyondBottomBorder(downTetromino),
              isCollide = overlapStack(s.board)(downTetromino)

        return {
        ...s,
        curTetromino: cannotMoveDown || isCollide ? s.curTetromino : downTetromino 
        }
    }
}

class Tick implements Action {
    /** 
     * Update the state by proceeding with one discrete time step.
     * 
     * @param s previous state
     * @returns new state
     */
    apply(s: State): State {
        if (s.board[0].some(Boolean)) {return {...s, gameOver: true}}

        const {curTetromino: curTetro, nextTetromino: nextTetro, tetroCreated } = s

        const 
            isRowFull = (row: ReadonlyArray<OptionalCube>): boolean => row.every(Boolean),

            clearFullRows = (board: ReadonlyArray<Row>): ReadonlyArray<Row> =>
                board.reduce( (accBoard, row) => isRowFull(row) 
                    ? [Array.from({length: Constants.GRID_WIDTH}, (cell) => null), ...accBoard] 
                    : [...accBoard, row], 
                    [] as ReadonlyArray<Row>),

            updateCubePosition = (board: ReadonlyArray<Row>): ReadonlyArray<Row> => 
                // Keep the null values and update the y position of the cube
                board.map((row, rowIdx) => row.map((b) => isNotNullOrUndefined(b) 
                    ? {...b, y: rowIdx} 
                    : b)),

            cubesToRemove = (board: ReadonlyArray<Row>): ReadonlyArray<Cube> =>
                // The second filter ensures that the array does not contain null object
                board
                    .filter(isRowFull)
                    .flatMap(row => row.filter(isNotNullOrUndefined));
    
        const 
            downTetromino = downGhostTetro(curTetro),         
            isCollision = isBottomGrid(curTetro) || overlapStack(s.board)(downTetromino),
            curTetroBoard = isCollision 
                ? curTetro.blocks.filter(({y}) => !(y < 0))       // Cubes above the top border are filtered out
                    .reduce((accBoard, block) => 
                        setBoardCell(accBoard, block.y, block.x, block), s.board)  
                : s.board;
        const
            updatedTetroCreated = isCollision ?  tetroCreated + 1 : tetroCreated,
            updatedBoard = updateCubePosition(clearFullRows(curTetroBoard)),
            updatedCurTetro = isCollision ? nextTetro : downTetromino,
            updatedNextTetro = isCollision ? randTetro(s.randNum)(updatedTetroCreated) : nextTetro,
            updatedGhostTetro = createGhostTetro(updatedBoard)(updatedCurTetro),
            exitCubes = cubesToRemove(curTetroBoard),
            exitPreview = isCollision ? nextTetro.blocks : null,
            newScore = s.score + exitCubes.length * 10;

        return {
            ...s, 
            curTetromino: updatedCurTetro,
            nextTetromino: updatedNextTetro,
            ghostTetromino: updatedGhostTetro,
            
            curLevel: 1 + Math.floor(s.rowsCleared / 2),      // Level up for every two rows cleared
            prevLevel: s.curLevel,
            score: newScore,
            highscore: Math.max(newScore, s.highscore),
            tetroCreated: updatedTetroCreated,
            rowsCleared: s.rowsCleared + exitCubes.length / 10,

            gameOver: curTetroBoard[0].some(Boolean),
            board: updatedBoard,
            
            exitBoard: exitCubes.concat(s.ghostTetromino.blocks),
            exitPreview: exitPreview,
            allBlocksCreated: s.allBlocksCreated
                                .concat(updatedCurTetro.blocks)
                                .concat(updatedNextTetro.blocks)
                                .concat(updatedGhostTetro.blocks),
        }
    }
}

/**
 * State transformation and reducer
 * 
 * @param s input State
 * @param action type of action to apply to the State
 * @returns a new State 
 */
const reduceState = (s: State,
                    [action, rndNum]: Readonly<[Action, number]>): State => 
            // Filter the game ticks according to the game level
            !(action instanceof Tick)
                ? action.apply({...s, randNum: rndNum})
                : s.tickCounter >= Math.max(1, 21 - s.curLevel)                    // Level cap is 20
                        ? action.apply({...s, randNum: rndNum, tickCounter: 0})
                        : {...s, tickCounter: s.tickCounter + 1}