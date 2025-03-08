"use client";
import Image from "next/image";
import React, {
  Children,
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import styles from "./MessageSection.module.scss";
import { convertDate } from "@/utils/functions/convertDate";
import RotatingClock from "../../icons/clock/RotatingClock";
import { motion } from "framer-motion";
import Typing from "./typing/Typing";
import Alert from "@/components/icons/alert.icon/Alert";
import MotionButton from "../../motion/button/MotionButton";
import RefetchIcon from "@/components/icons/refetch.icon/Refetch.icon";
import { useDispatch } from "react-redux";
import { ISendMessage } from "@/api/services/message/Message.service";
import { useSendMessage } from "@/api/hooks/useSendMessage";
import remarkGfm from "remark-gfm";
import { message as AntdMessage } from "antd";
import rehypeHighlight from "rehype-highlight";
import {
  dropError,
  removeMessage,
  setErrorMessage,
  setMessage,
  setMessageContantToBot,
  setSuccessMessage,
} from "@/reduxToolkit/Slices";
import { getFormattedDate } from "@/utils/functions/getFormattedDate";
import ReactMarkdown from "react-markdown";
import CopyIcon from "@/components/icons/copy.icon/Copy.icon";

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

  // const parsedMessage = useMemo(() => parseTextToBlocks(message), [message]);
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
      className={styles.message}
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
          priority={true}
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
            {isBot ? (
              sending ? (
                <Typing />
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className={`${styles.heading} ${styles.h1}`}>
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className={`${styles.heading} ${styles.h2}`}>
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className={`${styles.heading} ${styles.h3}`}>
                        {children}
                      </h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className={`${styles.heading} ${styles.h4}`}>
                        {children}
                      </h4>
                    ),
                    h5: ({ children }) => (
                      <h5 className={`${styles.heading} ${styles.h5}`}>
                        {children}
                      </h5>
                    ),
                    h6: ({ children }) => (
                      <h6 className={`${styles.heading} ${styles.h6}`}>
                        {children}
                      </h6>
                    ),
                    p: ({ children }) => (
                      <p className={styles.text}>{children}</p>
                    ),
                    code({ node, className, children, ...props }) {
                      const isInline =
                        node?.position?.start.line === node?.position?.end.line;

                      const extractTextFromChildren = (
                        children: ReactNode[] | string
                      ): string => {
                        let textContent = "";

                        if (typeof children === "string") {
                          textContent += children;
                        } else {
                          children.forEach((child: ReactNode | string) => {
                            if (typeof child === "string") {
                              textContent += child;
                            } else if (React.isValidElement(child)) {
                              textContent += extractTextFromChildren(
                                Children.toArray(
                                  (child.props as Element)
                                    ?.children as unknown as ReactNode[]
                                )
                              );
                            } else if (
                              typeof child === "number" ||
                              typeof child === "bigint"
                            ) {
                              textContent += child.toString();
                            } else if (child === true) {
                              textContent += "";
                            }
                          });
                        }

                        return textContent;
                      };

                      const match = /language-(\w+)/.exec(className || "");

                      return isInline ? (
                        <code className={styles.inlineCode}>{children}</code>
                      ) : (
                        <div className={styles.codeBlock}>
                          <span className={styles.codeHeader}>
                            {match && match[1]}
                            <CopyIcon
                              onClick={async () => {
                                try {
                                  if (children) {
                                    await navigator.clipboard.writeText(
                                      extractTextFromChildren(
                                        children as ReactNode[]
                                      )
                                    );
                                    AntdMessage.success("Код скопирован !");
                                  }
                                } catch (err) {
                                  console.log(err);
                                  AntdMessage.error(
                                    "Произошла ошибка копирования !"
                                  );
                                }
                              }}
                            />
                          </span>
                          <pre className={styles.code}>
                            <code {...props}>{children}</code>
                          </pre>
                        </div>
                      );
                    },
                    ul: ({ children }) => (
                      <ul className={styles.unorderedList}>{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className={styles.orderedList}>{children}</ol>
                    ),
                    li: ({ children }) => <li>{children}</li>,
                    a: ({ children, href }) => (
                      <a className={styles.link} href={href} target="_blank">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {message}
                </ReactMarkdown>
              )
            ) : (
              message
            )}
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
