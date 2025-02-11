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
import { setMessage, setSuccessMessage } from "@/reduxToolkit/Slices";
import { useSendMessage } from "@/api/hooks/useSendMessage";

const Footer: FC = () => {
  const [messageContant, setMessageContant] = useState<string>("");
  const messages = useSelector((state: IInitialState) => state.messages);
  const dispatch = useDispatch();

  const { mutateAsync: send_message, isPending: isLoadingSending } =
    useSendMessage();

  const handler = useCallback(() => {
    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, "0");
    const day = String(localDate.getDate()).padStart(2, "0");
    const hours = String(localDate.getHours()).padStart(2, "0");
    const minutes = String(localDate.getMinutes()).padStart(2, "0");
    const seconds = String(localDate.getSeconds()).padStart(2, "0");

    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;

    const newMessage: IMessage = {
      id: messages.length + 1,
      sender: "Вы",
      sendDate: formattedDate,
      sending: isLoadingSending,
      message: messageContant,
    };

    send_message(messageContant);
    dispatch(setMessage(newMessage));
    setMessageContant("");
  }, [messageContant, messages, dispatch, send_message, isLoadingSending]);

  useEffect(() => {
    if (!isLoadingSending) {
      dispatch(setSuccessMessage(messages.length + 1));
    }
  }, [isLoadingSending, dispatch, messages.length]);

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
