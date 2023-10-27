import { atom } from "recoil";

export const userGames = atom<{
  isLoading: boolean;
  games_as_p1: any;
  games_as_p2: any;
}>({
  key: "userGames",
  default: {
    isLoading: true,
    games_as_p1: null,
    games_as_p2: null,
  },
});
