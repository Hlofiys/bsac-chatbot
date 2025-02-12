import React from "react";
import styles from "./Loader.module.scss"; // импорт стилей

const Loader = () => {
  return (
    <div className={styles.loaderContainer}>
      <div className={styles.loader}></div>
    </div>
  );
};

export default Loader;
