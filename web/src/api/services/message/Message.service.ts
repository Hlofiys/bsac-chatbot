import { instance } from "@/axios";

class MessageService {
  async send(message: string) {
    return await instance.post("/chat", { message });
  }
}

const messageService = new MessageService();
export default messageService;
