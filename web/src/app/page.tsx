"use client";
import { FC } from "react";
import dynamic from "next/dynamic";
import styles from "./styles/Chatbot.module.scss";
import Header from "@/components/ui/header/Header";
import "@ant-design/v5-patch-for-react-19";
import Footer from "@/components/ui/footer/Footer";
import loading from "../../public/lottie/loading.json";
const ChatList = dynamic(() => import("@/components/ui/chatList/ChatList"), {
  loading: () => (
    <div
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Lottie animationData={loading} style={{ width: 100, height: 100 }} />
    </div>
  ),
  ssr: false,
});
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Lottie from "lottie-react";

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
