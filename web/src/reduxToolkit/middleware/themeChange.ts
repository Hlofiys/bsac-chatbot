// "use client"
import { Middleware } from "@reduxjs/toolkit";
import { hydrateTheme } from "../Slices";
import { IMessage } from "@/components/ui/chatList/messageSection/MessageSection";

// Определяем тип состояния стора
interface RootState {
  theme: "light" | "dark";
  messages: IMessage[];
}

// Определяем тип экшена, чтобы middleware правильно его обрабатывал
interface ThemeInitAction {
  type: "theme/init";
}

// Middleware с учетом типов
export const themeMiddleware: Middleware<unknown, RootState> =
  (store) => (next) => (action) => {
    if ((action as ThemeInitAction).type === "theme/init") {
      if (typeof window !== "undefined" && localStorage.getItem("theme")) {
        const savedTheme = localStorage.getItem("theme") as "light" | "dark";
        store.dispatch(hydrateTheme(savedTheme));
      }
    }
    return next(action);
  };
