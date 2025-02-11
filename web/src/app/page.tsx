"use client";
import { FC } from "react";
import styles from "./styles/Chatbot.module.scss";
import Header from "@/components/ui/header/Header";
import Footer from "@/components/ui/footer/Footer";
import "@ant-design/v5-patch-for-react-19";
import ChatList from "@/components/ui/chatList/ChatList";

const Chatbot: FC = () => {
  return (
    <div className={styles.container}>
      <Header />
      <ChatList />
      <Footer />
    </div>
  );
};

export default Chatbot;
