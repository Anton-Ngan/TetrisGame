import "./style.css";
import { fromEvent, interval, merge, Observable, withLatestFrom, Subject } from "rxjs";
import { map, filter, scan, startWith, switchMap } from "rxjs/operators";
import { initialState, reduceState, Left, Right, Down, Tick, Restart, RotateRight, RotateLeft, Drop  } from './state';
import { Key, State, Constants, Action } from './types';
import { render } from './view';
import { RNG } from './util';

/**
 * Main game function. Initialises all Observable streams.
 */
export function main() {

  /**
  * Converts values in a stream to random numbers in the range [0, 1]
  *
  * @param source$ The source Observable, elements of this are replaced with random numbers
  * @param seed The seed for the random number generator
  */
  function createRngStreamFromSource<T>(source$: Observable<T>) {
    return function createRngStream(
      seed: number = 0
    ): Observable<number> {
      const randomNumberStream = source$.pipe(
        scan((acc, _) => RNG.hash(acc), seed),
        map(RNG.scale)
      );

      return randomNumberStream;
    };
  }

  const 
    key$ = fromEvent<KeyboardEvent>(document, "keypress"),
    fromKey = (keyCode: Key) =>
      key$.pipe(
        filter( ({repeat}) => !repeat),
        filter( ({ code }) => code === keyCode)
      ),

    left$:    Observable<Left>         = fromKey("KeyA").pipe(map( _ => new Left())),
    right$:   Observable<Right>        = fromKey("KeyD").pipe(map( _ => new Right())),
    down$:    Observable<Down>         = fromKey("KeyS").pipe(map( _ => new Down())),
    restart$: Observable<Restart>      = fromKey("KeyR").pipe(map( _ => new Restart())),
    rotateR$: Observable<RotateRight>  = fromKey("KeyE").pipe(map( _ => new RotateRight())),
    rotateL$: Observable<RotateLeft>   = fromKey("KeyQ").pipe(map( _ => new RotateLeft())),
    drop$:    Observable<Drop>         = fromKey("Space").pipe(map( _ => new Drop())),
    rng$:     Observable<number>       = createRngStreamFromSource(interval(Constants.TICK_RATE_MS))(100);

  const tickRate$ = interval(Constants.TICK_RATE_MS).pipe(map( _ => new Tick()))

  // Main game logic
  const source$: Observable<Action> = 
          merge(tickRate$, 
                left$, right$, 
                down$, restart$, 
                rotateR$, rotateL$, 
                drop$)
  const state$: Observable<State> = source$.pipe(
    withLatestFrom(rng$), 
    scan(reduceState, initialState),
    startWith(initialState),
    )
  state$.subscribe(render);

}

// The following simply runs main function on window load.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}
