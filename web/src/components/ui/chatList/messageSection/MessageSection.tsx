"use client";
import Image from "next/image";
import { FC } from "react";
import styles from "./MessageSection.module.scss";
import { convertDate } from "@/utils/functions/convertDate";
import RotatingClock from "../../icons/clock/RotatingClock";
import { motion } from "framer-motion";
import Typing from "./typing/Typing";
import Alert from "@/components/icons/alert.icon/Alert";
import { useParseTextToBlocks } from "@/hooks/parseText/useParseTextToBlocks";

export interface IMessage {
  id: number;
  isBot?: boolean;
  sending?: boolean;
  error?: { status: boolean; refetch: () => void };
  sender: "Вы" | "БГАС ассистент";
  sendDate: string /*2025-01-18T10:03:00Z*/;
  message: string;
}

const MessageSection: FC<Omit<IMessage, "id">> = (props) => {
  const { isBot, sender, sendDate, message, sending, error } = props;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="message"
    >
      <section
        className={`${styles.messageSection} ${
          isBot ? styles.botSection : styles.userSection
        }`}
      >
        <Image
          src={isBot ? "/images/botImg.png" : "/images/Apple.png"}
          alt={sender}
          width={50}
          height={50}
          className={styles.senderImg}
        />
        <div className={styles.textBlock}>
          <article className={styles.messageHeader}>
            <p>{sender}</p>
            {error?.status ? (
              <Alert fill="red" onClick={error.refetch} />
            ) : sending ? (
              <RotatingClock fill={"#A0A0A0"} />
            ) : (
              <span>{sendDate && convertDate(sendDate).time}</span>
            )}
          </article>

          <aside className={isBot ? styles.bot : styles.user}>
            {isBot ? (
              sending ? (
                <Typing />
              ) : (
                useParseTextToBlocks(message)
              )
            ) : (
              message
            )}
          </aside>
        </div>
      </section>
    </motion.div>
  );
};

export default MessageSection;
