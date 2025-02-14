"use client";
import Image from "next/image";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./MessageSection.module.scss";
import { convertDate } from "@/utils/functions/convertDate";
import RotatingClock from "../../icons/clock/RotatingClock";
import { motion } from "framer-motion";
import Typing from "./typing/Typing";
import Alert from "@/components/icons/alert.icon/Alert";
import { parseTextToBlocks } from "@/hooks/parseText/useParseTextToBlocks";
import MotionButton from "../../motion/button/MotionButton";
import RefetchIcon from "@/components/icons/refetch.icon/Refetch.icon";
import { useDispatch } from "react-redux";
import { ISendMessage } from "@/api/services/message/Message.service";
import { useSendMessage } from "@/api/hooks/useSendMessage";
import {
  dropError,
  removeMessage,
  setErrorMessage,
  setMessage,
  setMessageContantToBot,
  setSuccessMessage,
} from "@/reduxToolkit/Slices";
import { getFormattedDate } from "@/utils/functions/getFormattedDate";

export interface IMessage {
  id: number;
  isBot?: boolean;
  sending?: boolean;
  error?: { status: boolean; dataToRefetch?: ISendMessage };
  sender: "Вы" | "БГАС ассистент";
  sendDate: string /*2025-01-18T10:03:00Z*/;
  message: string;
}

const MessageSection: FC<IMessage> = (props) => {
  const { isBot, sender, sendDate, message, sending, error, id } = props;

  const {
    data: responseMessage,
    mutateAsync: send_message,
    isSuccess: isSuccessSending,
  } = useSendMessage();

  const parsedMessage = useMemo(() => parseTextToBlocks(message), [message]);
  const [newBotMessageId, setNewBotMessageId] = useState<number | null>(null);
  const toFormatDate = useCallback(getFormattedDate, [getFormattedDate]);

  const dispatch = useDispatch();

  const onSendMessage = useCallback(async () => {
    if (!!!error?.dataToRefetch) return;

    const messageId = Date.now(); // Уникальный ID
    const newMessageBot: IMessage = {
      id: messageId + 1,
      isBot: true,
      sending: true,
      sender: "БГАС ассистент",
      sendDate: "",
      message: "",
    };
    setNewBotMessageId(newMessageBot.id);

    try {
      dispatch(setMessage(newMessageBot));
      dispatch(dropError({ id, error: undefined }));
      await send_message(error.dataToRefetch, {
        onSuccess: () => dispatch(setSuccessMessage(id)), // Изменяем статус отправленного сообщения
      });
    } catch (err) {
      console.log(err);
      dispatch(
        setErrorMessage({
          id: id,
          dataToRefetch: error.dataToRefetch,
        })
      );
      dispatch(removeMessage(newMessageBot.id));
    }
  }, [error, dispatch, send_message, id]);

  useEffect(() => {
    if (isSuccessSending && responseMessage?.data.response && newBotMessageId) {
      dispatch(
        setMessageContantToBot({
          id: newBotMessageId,
          message: responseMessage?.data.response,
          sendDate: toFormatDate(),
        })
      );
    }
  }, [
    newBotMessageId,
    isSuccessSending,
    responseMessage?.data.response,
    dispatch,
    toFormatDate,
  ]);

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
              <Alert fill="red" />
            ) : sending ? (
              <RotatingClock fill={"#A0A0A0"} />
            ) : (
              <span>{sendDate && convertDate(sendDate).time}</span>
            )}
          </article>

          <aside
            className={
              isBot
                ? styles.bot
                : `${styles.user} ${(error && styles.errorMessage) || ""}`
            }
          >
            {isBot ? sending ? <Typing /> : parsedMessage : message}
          </aside>

          {!isBot && error && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "100%", opacity: 1 }}
              transition={{ duration: 0, ease: "easeInOut" }}
            >
              <MotionButton
                disabled={!!!error.dataToRefetch}
                onClick={onSendMessage}
              >
                <RefetchIcon />
              </MotionButton>
            </motion.div>
          )}
        </div>
      </section>
    </motion.div>
  );
};

export default MessageSection;
