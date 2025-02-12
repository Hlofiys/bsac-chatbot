"use client";
import { FC, Suspense } from "react";
import dynamic from "next/dynamic";
import styles from "./styles/Chatbot.module.scss";
import "@ant-design/v5-patch-for-react-19";
import loading from "../../public/lottie/loading.json";
const ChatList = dynamic(() => import("@/components/ui/chatList/ChatList"), {
  ssr: false,
});
const Header = dynamic(() => import("@/components/ui/header/Header"), {
  ssr: false,
});
const Footer = dynamic(() => import("@/components/ui/footer/Footer"), {
  ssr: false,
});
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Lottie from "lottie-react";

const Chatbot: FC = () => {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <div className={styles.container}>
        <Suspense
          fallback={
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lottie
                animationData={loading}
                style={{ width: 100, height: 100 }}
              />
            </div>
          }
        >
          <Header />
          <ChatList />
          <Footer />
        </Suspense>
      </div>
    </QueryClientProvider>
  );
};

export default Chatbot;
