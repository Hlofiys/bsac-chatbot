"use client";
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
      // Проверяем, что выполняемся на клиенте
      if (typeof window !== "undefined") {
        setTimeout(() => {
          const savedTheme = localStorage.getItem("theme") as
            | "light"
            | "dark"
            | null;

          // Убеждаемся, что тема не undefined, чтобы избежать SSR-проблем
          if (savedTheme && store.getState().theme !== savedTheme) {
            store.dispatch(hydrateTheme(savedTheme));
          }
        }, 0);
      }
    }
    return next(action);
  };
