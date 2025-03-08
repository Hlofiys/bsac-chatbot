"use client";
import { FC, ReactNode } from "react";
import store from "@/reduxToolkit/Store";
import { Provider } from "react-redux";
import BodyLayout from "../bodyLayout/BodyLayout";

const ReduxProvider: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <Provider store={store}>
      <BodyLayout>{children}</BodyLayout>
    </Provider>
  );
};

export default ReduxProvider;
