import React from "react";
import styles from "./GreetingCard.module.scss";
import Lottie from "lottie-react";
import greeting from "../../../public/lottie/greeting.json";

const GreetingCard = () => {
  return (
    <div className={styles.welcomeCard}>
      <Lottie animationData={greeting} className={styles.greeting} />
      <div className={styles.content}>
        <h2>Привет !</h2>
        <p>
          Я — интеллектуальный ассистент, созданный для решения задач по КПиЯП.
          Задавайте вопросы, и я помогу разобраться в деталях.
        </p>
      </div>
    </div>
  );
};

export default GreetingCard;
