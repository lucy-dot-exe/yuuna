// Given the current state, if an event happens, what's the next state?
// NextStateFunction<State> comes from the engine's ambient types

import { FOOD_LIFETIME, POPUP_DURATION, SPAWN_INTERVAL } from "./constants";
import { GameState, spawnFood } from "./state";

export const nextState: NextStateFunction<GameState> = (props) => {
  // Starts the background music once, the first time nextState runs —
  // playMusic() loops the track and keeps it running in the background
  // from here on, independent of frame updates or clicks
  if (!props.state.isMusicStarted) {
    props.playMusic("theme");

    return { ...props.state, isMusicStarted: true, isMusicPlaying: true };
  }

  // If the music icon is clicked, toggle it: pauseMusic() leaves it where
  // it stopped, so a later playMusic() call picks back up instead of
  // restarting the track
  if (props.event.tag === "CLICK" && props.event.id === "music-toggle") {
    if (props.state.isMusicPlaying) {
      props.pauseMusic();
    } else {
      props.playMusic("theme");
    }

    return { ...props.state, isMusicPlaying: !props.state.isMusicPlaying };
  }

  // If a food is clicked, collect it: score a point, play the collect
  // sound, pop a "+1" where it was clicked, and remove the food so it
  // can't be clicked (or expire) again
  if (props.event.tag === "CLICK" && props.event.id?.startsWith("food-")) {
    const clickedId = props.event.id;
    const { mouse } = props.event;

    props.playSound("collect");

    return {
      ...props.state,
      eaten: props.state.eaten + 1,
      foods: props.state.foods.filter((food) => `food-${food.id}` !== clickedId),
      popups: [...props.state.popups, { id: props.state.nextPopupId, x: mouse.x, y: mouse.y, age: 0 }],
      nextPopupId: props.state.nextPopupId + 1,
    };
  }

  // On every frame tick: age out foods and popups, and spawn a new food
  // once the spawn timer runs out
  if (props.event.tag === "TIME") {
    const { delta } = props.event;

    const foods = props.state.foods
      .map((food) => ({ ...food, age: food.age + delta }))
      .filter((food) => food.age < FOOD_LIFETIME);

    const popups = props.state.popups
      .map((popup) => ({ ...popup, age: popup.age + delta }))
      .filter((popup) => popup.age < POPUP_DURATION);

    const spawnTimer = props.state.spawnTimer - delta;

    if (spawnTimer > 0) {
      return { ...props.state, foods, popups, spawnTimer };
    }

    return {
      ...props.state,
      foods: [...foods, spawnFood(props.state.nextFoodId)],
      nextFoodId: props.state.nextFoodId + 1,
      spawnTimer: spawnTimer + SPAWN_INTERVAL,
      popups,
    };
  }

  // Else, state remains unchanged
  return props.state;
};
