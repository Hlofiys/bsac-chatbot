"use client";
import { FC } from "react";
import dynamic from "next/dynamic";
import styles from "./styles/Chatbot.module.scss";
import "@ant-design/v5-patch-for-react-19";
const ChatList = dynamic(() => import("@/components/ui/chatList/ChatList"), {
  loading: ()=><div/>,
  ssr: false,
});
import Header from "@/components/ui/header/Header";
import Footer from "@/components/ui/footer/Footer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const Chatbot: FC = () => {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <div className={styles.container}>
        <Header />
        <ChatList />
        <Footer />
      </div>
    </QueryClientProvider>
  );
};

export default Chatbot;
