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
  removeMessage,
  setErrorMessage,
  setMessage,
  setMessageContantToBot,
  setSuccessMessage,
} from "@/reduxToolkit/Slices";
import { useSendMessage } from "@/api/hooks/useSendMessage";
import { ISendMessage } from "@/api/services/message/Message.service";
import { getFormattedDate } from "@/utils/functions/getFormattedDate";

const Footer: FC = () => {
  const [messageContant, setMessageContant] = useState<string>("");
  const [newBotMessageId, setNewBotMessageId] = useState<number | null>(null);
  const messages = useSelector((state: IInitialState) => state.messages);
  const dispatch = useDispatch();

  const {
    data: responseMessage,
    mutateAsync: send_message,
    isSuccess,
  } = useSendMessage();

  const toFormatDate = useCallback(getFormattedDate, [getFormattedDate]);

  const handler = useCallback(async () => {
    const messageId = Date.now(); // Уникальный ID

    const newMessageUser: IMessage = {
      id: messageId,
      sender: "Вы",
      sendDate: toFormatDate(),
      sending: true, // Отправляется
      message: messageContant,
    };

    const newMessageBot: IMessage = {
      id: messageId + 1,
      isBot: true,
      sending: true,
      sender: "БГАС ассистент",
      sendDate: "",
      message: "",
    };
    dispatch(setMessage(newMessageUser));
    dispatch(setMessage(newMessageBot));
    setNewBotMessageId(newMessageBot.id);
    setMessageContant("");

    const body: ISendMessage = {
      message: messageContant,
      history: messages.map((item) => ({
        role: item.isBot ? "assistant" : "user",
        content: item.message,
      })),
    };
    try {
      await send_message(body, {
        onSuccess: () => dispatch(setSuccessMessage(messageId)), // Изменяем статус отправленного сообщения
      });
    } catch (err) {
      console.log(err)
      dispatch(
        setErrorMessage({
          id: messageId,
          dataToRefetch: body,
        })
      );
      dispatch(removeMessage(newMessageBot.id));
    }
  }, [messages, messageContant, dispatch, send_message, toFormatDate]);

  useEffect(() => {
    if (isSuccess && responseMessage?.data.response && newBotMessageId) {
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
    isSuccess,
    responseMessage?.data.response,
    dispatch,
    toFormatDate
  ]);

  const isDisabledSending = useMemo(
    () =>
      !!!messageContant.trim() ||
      (messages.length > 0 && messages[messages.length - 1].sending),
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
