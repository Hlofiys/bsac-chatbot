'use client'
import { FC, useMemo, useEffect, useRef } from "react";
import MessageSection from "./messageSection/MessageSection";
import styles from "./ChatList.module.scss";
import { useSelector } from "react-redux";
import { IInitialState } from "@/reduxToolkit/Interfaces";
import GreetingCard from "@/components/greeting/GreetingCard";

const ChatList: FC = () => {
  const messages = useSelector((state: IInitialState) => state.messages);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const isEmptyChat = useMemo(() => !!messages.length, [messages]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div
      className={`${styles.chatListContainer} ${!isEmptyChat ? styles.greeting : ""}`}
    >
      {(isEmptyChat &&
        messages.map((message) => (
          <MessageSection key={message.id} {...message} />
        ))) || <GreetingCard />}
      
      {/* Реф для последнего сообщения */}
      <div ref={chatEndRef} />
    </div>
  );
};

export default ChatList;
