import { configureStore } from "@reduxjs/toolkit";
import { messagesReducer, themeReducer } from "./Slices";
import { themeMiddleware } from "./middleware/themeChange";

const store = configureStore({
  reducer: {
    theme: themeReducer,
    messages: messagesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(themeMiddleware),
});

// Инициализация темы при старте приложения
store.dispatch({ type: "theme/init" });

export default store;
