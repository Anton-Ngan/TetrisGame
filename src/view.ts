export { render, gameover }
import { State, Viewport, Block, Cube, Position } from './types'
import { attr, isNotNullOrUndefined } from './util'

//////////////////////////////////// DOCUMENT ELEMENTS ////////////////////////////////////
const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
HTMLElement;
const preview = document.querySelector("#svgPreview") as SVGGraphicsElement &
HTMLElement;
const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
HTMLElement;
const container = document.querySelector("#main") as HTMLElement;

svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);
preview.setAttribute("height", `${Viewport.PREVIEW_HEIGHT}`);
preview.setAttribute("width", `${Viewport.PREVIEW_WIDTH}`);

// Text fields
const levelText = document.querySelector("#levelText") as HTMLElement;
const scoreText = document.querySelector("#scoreText") as HTMLElement;
const highScoreText = document.querySelector("#highScoreText") as HTMLElement;

//////////////////////////////////// SVG CANVAS & VIEW ////////////////////////////////////
/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
const show = (elem: SVGGraphicsElement) => {
    elem.setAttribute("visibility", "visible");
    elem.parentNode!.appendChild(elem);
  };
  
/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
 */
const hide = (elem: SVGGraphicsElement) =>
elem.setAttribute("visibility", "hidden");

/**
 * Creates an SVG element with the given properties.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
 * element names and properties.
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
const createSvgElement = (
    namespace: string | null,
    name: string,
    props: Record<string, string> = {},
  ) => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
};

/**
 * Renders the current state to the canvas.
 *
 * In MVC terms, this updates the View using the Model.
 *
 * @param s Current state
 * @returns void
 */
const render = (s: State): void  => {

    const {curTetromino: curTetro, 
           ghostTetromino: ghostTetro, 
           nextTetromino: nextTetro} = s

    const 
        rescaleToCanvas = (position: number) => position * Block.WIDTH,
        removeCubeView = (rootSVG: HTMLElement) => (c: HTMLElement | null): void => {
            if (isNotNullOrUndefined(c)) {rootSVG.removeChild(c)}
        },
        updateCubeView = (rootSVG: HTMLElement, 
                {x, y}: Position={x: 0, y: 0}, opacity: number=1) =>
            (c: Cube): void => {
                function createCubeView(): SVGElement {
                    const v = 
                        createSvgElement(rootSVG.namespaceURI, "rect", {  
                            height: `${Block.HEIGHT}`,
                            width: `${Block.WIDTH}`,
                            x: `${c.x}`, 
                            y: `${c.y}`,
                            rx: "5",              // Rounded corners for a softer appearance
                            ry: "5",
                            style: `fill: ${c.colour}; opacity: ${opacity}; stroke: black; stroke-width: 1px;`,   
                            id: c.id
                            })
                    rootSVG.append(v)
                    return v
                    }
    
                // Update the x and y position of the cube element if it exists in the canvas.
                // Otherwise add the cube element into the SVG canvas.
                const 
                    elemHTML = document.getElementById(c.id),
                    cubeSVG = elemHTML && rootSVG.contains(elemHTML) 
                        ? document.getElementById(c.id) 
                        : createCubeView()
                if (cubeSVG) {
                    attr(cubeSVG, {x: rescaleToCanvas(c.x + x), y: rescaleToCanvas(c.y + y)})
                }
            }
    
    // Remove the exiting preview and exiting board cubes from their root SVG
    const validExitPreview = s.exitPreview 
            ? s.exitPreview.filter(c => preview.contains(document.getElementById(c.id))) 
            : null
    if (validExitPreview) {
        validExitPreview.forEach(c => (document.getElementById(c.id)) 
            ? removeCubeView(preview)(document.getElementById(c.id))     
            : {})   // Do nothing
    };
    
    s.exitBoard
        .filter(c => svg.contains(document.getElementById(c.id)))
        .map((c) => document.getElementById(c.id))
        .forEach(removeCubeView(svg))
    
    // Add or update the falling, preview, ghost and board cubes into their root SVG
    curTetro.blocks.forEach(updateCubeView(svg))
    nextTetro.blocks.forEach(updateCubeView(preview, {x: -0.75, y: 3}))
    ghostTetro.blocks.forEach(updateCubeView(svg, {x: 0, y: 0}, 0.15))
    s.board
        .map(((row) => row.filter(isNotNullOrUndefined)))
        .forEach(row => row.forEach(updateCubeView(svg)))

    highScoreText.innerHTML = String(s.highscore)
    scoreText.innerHTML = String(s.score)
    levelText.innerHTML = String(s.curLevel)

    if (s.gameOver) {
        show(gameover)
        // Remove all the blocks created in the preview and svg canvas
        s.allBlocksCreated
            .filter(c => svg.contains(document.getElementById(c.id)))
            .forEach(c => (document.getElementById(c.id)) 
                ? removeCubeView(svg)(document.getElementById(c.id))
                : {});    // Do nothing
        s.allBlocksCreated
            .filter(c => preview.contains(document.getElementById(c.id)))
            .forEach(c => (document.getElementById(c.id)) 
                ? removeCubeView(preview)(document.getElementById(c.id))
                : {});    // Do nothing
    }
    else {
        hide(gameover)
    }
}