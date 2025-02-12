// Typing.tsx
import { FC } from "react";
import styles from "./Typing.module.scss";

const Typing: FC = () => {
  return (
    <div className={styles.typingContainer}>
      <span className={styles.dot}></span>
      <span className={styles.dot}></span>
      <span className={styles.dot}></span>
    </div>
  );
};

export default Typing;
