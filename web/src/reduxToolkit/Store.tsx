import { configureStore } from "@reduxjs/toolkit";
import { messagesReducer, themeReducer } from "./Slices";

const store = configureStore({
  reducer: {
    theme: themeReducer,
    messages: messagesReducer,
  },
});

export default store;
