"use client";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TTheme } from "./Interfaces";
import { IInitialState } from "./Interfaces";
import { IMessage } from "@/components/ui/chatList/messageSection/MessageSection";
import { ISendMessage } from '@/api/services/message/Message.service';

const initialState: IInitialState = {
  theme: "dark",
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
    setErrorMessage: (
      _state,
      payload: PayloadAction<{ id: number, dataToRefetch: ISendMessage }>
    ) => {
      return (_state = _state.map((message) =>
        message.id === payload.payload.id
          ? {
              ...message,
              error: { status: true, dataToRefetch: payload.payload.dataToRefetch},
            }
          : message
      ));
    },
    dropError: (
      _state,
      payload: PayloadAction<{id: number, error: undefined}>
    ) => {
      return (_state = _state.map((message) =>
        message.id === payload.payload.id
          ? {
              ...message,
              error: payload.payload.error,
            }
          : message
      ));
    },
    setMessageContantToBot: (
      _state,
      payload: PayloadAction<{ id: number; message: string; sendDate: string }>
    ) => {
      return (_state = _state.map((message) =>
        message.id === payload.payload.id
          ? {
              ...message,
              sending: false,
              message: payload.payload.message,
              sendDate: payload.payload.sendDate,
            }
          : message
      ));
    },
    removeMessage: (_state,
      payload: PayloadAction<number>) => {
        return _state = _state.filter(message=>message.id !== payload.payload)
    }
  },
});

//export all actions:
export const { setTheme, hydrateTheme } = themeSlice.actions;
export const {
  setMessage,
  setSuccessMessage,
  setErrorMessage,
  dropError,
  setMessageContantToBot,
  removeMessage
} = messagesSlice.actions;

//export all redusers
export const themeReducer = themeSlice.reducer;
export const messagesReducer = messagesSlice.reducer;
