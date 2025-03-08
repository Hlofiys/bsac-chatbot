import "./styles/layout.css";
import ReduxProvider from "@/components/ui/reduxProvider/ReduxProvider";

export const metadata = {
  metadataBase: new URL("https://chat.hlofiys.xyz"), // ✅ Добавляем базовый URL
  title: "chatbot",
  openGraph: {
    type: "website",
    title: "БГАС Ассистент",
    description:
      'Помощник в изучении предмета "Конструирование Программ и Языки Программирования"',
    url: "https://chat.hlofiys.xyz",
    images: "/images/ChatBotGraph.png", // ✅ Относительный путь теперь корректно обрабатывается
    siteName: "bsac.assistant",
    locale: "ru_RU",
  },
  icons: {
    icon: "/favicon.ico", // ✅ Путь к фавиконке исправлен
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <ReduxProvider>{children}</ReduxProvider>
    </html>
  );
}
