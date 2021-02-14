import { writable } from "svelte/store";

const createWritableStore = (key, startValue) => {
  const { subscribe, set } = writable(startValue);

  return {
    subscribe,
    set,
    useLocalStorage: () => {
      const json = localStorage.getItem(key);
      if (json) {
        set(JSON.parse(json));
      }

      subscribe((current) => {
        localStorage.setItem(key, JSON.stringify(current));
      });
    },
  };
};

export const tiles = createWritableStore("tiles", []);
export const imageData = createWritableStore("imageData", []);
export const grid = createWritableStore("grid", { data: [], x: 0, y: 0 });
export const modalOpen = createWritableStore("modalOpen", false);
export const mode = createWritableStore("mode", "create");

export const selectedIndex = createWritableStore("selectedIndex", -1);

tiles.useLocalStorage();
imageData.useLocalStorage();
modalOpen.useLocalStorage();
grid.useLocalStorage();
