"use client";
import { FC, useMemo } from "react";
import MessageSection from "./messageSection/MessageSection";
import styles from "./ChatList.module.scss";
import { useSelector } from "react-redux";
import { IInitialState } from "@/reduxToolkit/Interfaces";
// import { messages } from "@/utils/data/TestMessages";
import GreetingCard from "@/components/greeting/GreetingCard";

const ChatList: FC = () => {
  const messages = useSelector((state:IInitialState)=>state.messages);

  const isEmptyChat = useMemo(() => !!messages.length, [messages]);

  return (
    <div
      className={`${styles.chatListContainer} ${
        !isEmptyChat ? styles.greeting : ""
      }`}
    >
      {(isEmptyChat &&
        messages.map((message) => (
          <MessageSection key={message.id} {...message} />
        ))) || <GreetingCard />}
    </div>
  );
};

export default ChatList;
