"use client";
import {
  FC,
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import styles from "./Footer.module.scss";
import TextArea from "antd/es/input/TextArea";
import Telegram from "@/components/icons/telegram.icon/Telegram.icon";
import { Button } from "antd";
import { IMessage } from "../chatList/messageSection/MessageSection";
import { useDispatch, useSelector } from "react-redux";
import { IInitialState } from "@/reduxToolkit/Interfaces";
import {
  setErrorMessage,
  setMessage,
  setMessageContantToBot,
  setSuccessMessage,
} from "@/reduxToolkit/Slices";
import { useSendMessage } from "@/api/hooks/useSendMessage";

const Footer: FC = () => {
  const [messageContant, setMessageContant] = useState<string>("");
  const messages = useSelector((state: IInitialState) => state.messages);
  const dispatch = useDispatch();

  const {
    data: responseMessage,
    mutateAsync: send_message,
    isSuccess,
    
  } = useSendMessage();

  const getFormattedDate = useCallback(() => {
    return new Date().toISOString().split(".")[0] + "Z";
  }, []);

  const handler = useCallback(async () => {
    const messageId = Date.now(); // Уникальный ID

    const newMessageUser: IMessage = {
      id: messageId,
      sender: "Вы",
      sendDate: getFormattedDate(),
      sending: true, // Отправляется
      message: messageContant,
    };

    const newMessageBot: IMessage = {
      id: messageId + 1,
      isBot: true,
      sending: true,
      sender: "БГАС ассистент",
      sendDate: '',
      message: "",
    };
    dispatch(setMessage(newMessageUser));
    dispatch(setMessage(newMessageBot));
    setMessageContant("");

    try {
      await send_message(messageContant);
      dispatch(setSuccessMessage(messageId)); // Изменяем статус отправленного сообщения
    } catch (error) {
      console.error("Ошибка при отправке сообщения:", error);
      dispatch(setErrorMessage({id: messageId, refetch: ()=>send_message(messageContant)}));
    }
  }, [messageContant, dispatch, send_message, getFormattedDate]);

  useEffect(() => {
    if (isSuccess && responseMessage?.data.response) {
      // const botMessage: IMessage = {
      //   id: Date.now(), // Уникальный ID для бота
      //   isBot: true,
      //   sending: false,
      //   sender: "БГАС ассистент",
      //   sendDate: getFormattedDate(),
      //   message: responseMessage.data.response || "Ошибка",
      // };

      // dispatch(setMessage(botMessage));
      dispatch(
        setMessageContantToBot({
          id: messages[messages.length - 1].id,
          message: responseMessage?.data.response,
          sendDate: getFormattedDate()
        })
      );
    }
  }, [messages, isSuccess, responseMessage?.data.response, dispatch, getFormattedDate]);

  const isDisabledSending = useMemo(
    () => !!!messageContant.trim() || messages[messages.length - 1]?.sending,
    [messages, messageContant]
  );

  const onKeyDownHandler = useCallback<
    KeyboardEventHandler<HTMLTextAreaElement>
  >(
    (e) => {
      if (e.key === "Enter") {
        if (e.shiftKey) {
          e.preventDefault();
          setMessageContant((prev) => prev + "\n");
        } else {
          if (!isDisabledSending) {
            e.preventDefault();
            handler();
          }
        }
      }
    },
    [isDisabledSending, handler]
  );

  return (
    <footer className={styles.footer}>
      <form className={styles.form}>
        <TextArea
          value={messageContant}
          onChange={(e) => setMessageContant(e.target.value)}
          onKeyDown={onKeyDownHandler}
          className={styles.textarea}
          placeholder="Написать сообщение..."
          autoSize={{ minRows: 1, maxRows: 5 }}
        />

        <Button
          type="primary"
          disabled={isDisabledSending}
          onClick={handler}
          className={styles.sendBtn}
        >
          <Telegram />
        </Button>
      </form>
    </footer>
  );
};

export default Footer;
