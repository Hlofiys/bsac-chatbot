"use client";
import { FC, useEffect } from "react";
import dynamic from "next/dynamic";
import styles from "./styles/Chatbot.module.scss";
import "@ant-design/v5-patch-for-react-19";
const ChatList = dynamic(() => import("@/components/ui/chatList/ChatList"), {
  loading: () => <div />,
  ssr: false,
});
import Header from "@/components/ui/header/Header";
import Footer from "@/components/ui/footer/Footer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { hydrateTheme } from "@/reduxToolkit/Slices";

const Chatbot: FC = () => {
  const queryClient = new QueryClient();

  // const theme = useThemeInitializer();

  // // Ждём, пока тема загрузится, чтобы не было SSR-ошибки
  // if (theme === null) return null;
  const dispatch = useDispatch();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;

    if (savedTheme) {
      dispatch(hydrateTheme(savedTheme));
    }
  }, [dispatch]);

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
