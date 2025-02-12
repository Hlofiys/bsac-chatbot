import { instance } from "@/axios";

class MessageService {
  async send(message: string) {
    return await instance.post<{response: string}>("/chat", { message });
  }
}

const messageService = new MessageService();
export default messageService;
