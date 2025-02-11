import { Middleware } from "@reduxjs/toolkit";
import { hydrateTheme } from "../Slices";

// Уточняем тип экшена, чтобы middleware правильно обрабатывал action
export const themeMiddleware: Middleware = (store) => (next) => (action: any) => {
  // Обрабатываем пользовательское действие
  if (action.type === "theme/init") {
    const savedTheme = !!localStorage && localStorage.getItem("theme") as "light" | "dark";
    if (savedTheme) {
      store.dispatch(hydrateTheme(savedTheme));
    }
  }
  return next(action);
};
