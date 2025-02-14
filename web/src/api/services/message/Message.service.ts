import { instance } from "@/axios";

export interface IHistoryItem {
  role: "user" | "assistant";
  content: string;
}
export interface ISendMessage {
  message: string;
  history: IHistoryItem[];
}
class MessageService {
  async send(body: ISendMessage) {
    return await instance.post<{ response: string }>('/chat', { ...body });
  }
}

const messageService = new MessageService();
export default messageService;
