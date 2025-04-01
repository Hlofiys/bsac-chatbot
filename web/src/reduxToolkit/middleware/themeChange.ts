'use client'
import { Middleware } from "@reduxjs/toolkit";
import { hydrateTheme } from "../Slices";
import { IMessage } from "@/components/ui/chatList/messageSection/MessageSection";

interface RootState {
  theme: "light" | "dark";
  messages: IMessage[];
}

interface ThemeInitAction {
  type: "theme/init";
}

export const themeMiddleware: Middleware<unknown, RootState> =
  (store) => (next) => (action) => {
    if ((action as ThemeInitAction).type === "theme/init") {
      if (typeof window !== "undefined") {
        // Даем время на инициализацию React перед чтением localStorage
        requestAnimationFrame(() => {
          const savedTheme = localStorage.getItem("theme") as
            | "light"
            | "dark"
            | null;
          if (savedTheme) {
            store.dispatch(hydrateTheme(savedTheme));
          }
        });
      }
    }
    return next(action);
  };
