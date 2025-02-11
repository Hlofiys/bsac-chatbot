import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TTheme } from "./Interfaces";
import { IInitialState } from "./Interfaces";
import { IMessage } from "@/components/ui/chatList/messageSection/MessageSection";

// const initialTheme = (typeof window !== 'undefined' && localStorage.getItem('theme')) || 'light';

const initialState: IInitialState = {
  theme: "dark" as "light" | "dark",
  messages: [],
};

const themeSlice = createSlice({
  name: "themeSlice",
  initialState: initialState.theme,
  reducers: {
    setTheme: (_state, payload: PayloadAction<TTheme>) => {
      localStorage.setItem("theme", payload.payload);
      return (_state = payload.payload);
    },
    hydrateTheme: (_state, payload: PayloadAction<TTheme>) =>
      (_state = payload.payload),
  },
});

const messagesSlice = createSlice({
  name: "messagesSlice",
  initialState: initialState.messages,
  reducers: {
    setMessage: (_state, payload: PayloadAction<IMessage>) => {
      return (_state = [..._state, payload.payload]);
    },
    setSuccessMessage: (_state, payload: PayloadAction<number>) => {
      return (_state = _state.map((message) =>
        message.id === payload.payload
          ? { ...message, sending: false }
          : message
      ));
    },
  },
});

//export all actions:
export const { setTheme, hydrateTheme } = themeSlice.actions;
export const { setMessage, setSuccessMessage } = messagesSlice.actions;

//export all redusers
export const themeReducer = themeSlice.reducer;
export const messagesReducer = messagesSlice.reducer;
