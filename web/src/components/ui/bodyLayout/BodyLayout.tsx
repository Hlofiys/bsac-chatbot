"use client";
import { IInitialState } from "@/reduxToolkit/Interfaces";
import { FC, ReactNode } from "react";
import { useSelector } from "react-redux";

const BodyLayout: FC<{ children: ReactNode }> = ({ children }) => {
  const theme = useSelector((state: IInitialState) => state.theme);
  return <body data-theme={theme}>{children}</body>;
};

export default BodyLayout;
