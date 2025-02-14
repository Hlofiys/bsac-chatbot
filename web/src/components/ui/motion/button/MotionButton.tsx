"use client";
import { FC, ReactNode } from "react";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import { IInitialState } from "@/reduxToolkit/Interfaces";
import styles from "./MotionButton.module.scss";

interface IMotionButtonProps {
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}
const MotionButton: FC<IMotionButtonProps> = (props) => {
  const { children, onClick, disabled } = props;
  const theme = useSelector((state: IInitialState) => state.theme);

  return (
    <motion.button
      onClick={onClick}
      style={{ width: "100%" }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }} // Сжимаем кнопку, если кликнули
      exit={{ scaleX: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className={`${styles.button} ${styles[theme]}`}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
};

export default MotionButton;
