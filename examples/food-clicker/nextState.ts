// Given the current state, if an event happens, what's the next state?
// NextStateFunction<State> comes from the engine's ambient types

import {
  COMBO_WINDOW,
  FOOD_LIFETIME,
  GameState,
  POPUP_DURATION,
  initialState,
  spawnFood,
  spawnIntervalFor,
} from "./state";

// Shared by foods and popups below — both are just an id plus an age that
// disqualifies them past some max
const ageAndExpire = <T extends { age: number }>(items: T[], delta: number, maxAge: number): T[] =>
  items.map((item) => ({ ...item, age: item.age + delta })).filter((item) => item.age < maxAge);

export const nextState: NextStateFunction<GameState> = (props) => {
  // Title screen: Start begins a fresh round
  if (props.state.phase === "title") {
    if (props.event.tag === "CLICK" && props.event.id === "start-button") {
      return { ...initialState, phase: "playing" };
    }

    return props.state;
  }

  // Game over screen: the button just returns to the title
  if (props.state.phase === "over") {
    if (props.event.tag === "CLICK" && props.event.id === "restart-button") {
      return { ...props.state, phase: "title" };
    }

    return props.state;
  }

  // From here on, phase is "playing"

  // Catching a food: score it — more, the sooner it follows the last
  // catch — pop a "+n" where it was clicked, and remove the food so it
  // can't be caught (or expire) again
  if (props.event.tag === "CLICK" && props.event.id?.startsWith("food-")) {
    const clickedId = props.event.id;
    const { mouse } = props.event;

    const combo = props.state.sinceLastCatch < COMBO_WINDOW ? props.state.combo + 1 : 1;

    return {
      ...props.state,
      score: props.state.score + combo,
      combo,
      sinceLastCatch: 0,
      foods: props.state.foods.filter((food) => `food-${food.id}` !== clickedId),
      popups: [
        ...props.state.popups,
        { id: props.state.nextPopupId, x: mouse.x, y: mouse.y, age: 0, value: combo },
      ],
      nextPopupId: props.state.nextPopupId + 1,
    };
  }

  // On every frame tick: count the round down (ending it once time's up),
  // age out foods and popups, and spawn a new food once the spawn timer
  // runs out — that timer's own length shrinks with the current combo, so
  // a hot streak speeds up the whole game along with it
  if (props.event.tag === "TIME") {
    const { delta } = props.event;

    const timeLeft = props.state.timeLeft - delta;

    if (timeLeft <= 0) {
      return { ...props.state, phase: "over", timeLeft: 0, foods: [], popups: [] };
    }

    const foods = ageAndExpire(props.state.foods, delta, FOOD_LIFETIME);
    const popups = ageAndExpire(props.state.popups, delta, POPUP_DURATION);

    const spawnTimer = props.state.spawnTimer - delta;
    const sinceLastCatch = props.state.sinceLastCatch + delta;

    if (spawnTimer > 0) {
      return { ...props.state, timeLeft, foods, popups, spawnTimer, sinceLastCatch };
    }

    return {
      ...props.state,
      timeLeft,
      foods: [...foods, spawnFood(props.state.nextFoodId)],
      nextFoodId: props.state.nextFoodId + 1,
      spawnTimer: spawnTimer + spawnIntervalFor(props.state.combo),
      popups,
      sinceLastCatch,
    };
  }

  // Else, state remains unchanged
  return props.state;
};
