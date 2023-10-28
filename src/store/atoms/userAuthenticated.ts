import { atom } from "recoil";

export const userAuthenticated = atom<{
  isLoading: boolean;
  userAuthenticated: boolean;
}>({
  key: "userAuthenticated",
  default: {
    isLoading: true,
    userAuthenticated: false,
  },
});
