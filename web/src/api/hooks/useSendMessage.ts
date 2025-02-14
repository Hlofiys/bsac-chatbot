import { useMutation } from "@tanstack/react-query";
import MessageService, { ISendMessage } from "../services/message/Message.service";
import { message } from "antd";

export const useSendMessage = () => {
  return useMutation({
    mutationKey: ["sendMessage"],
    mutationFn: (body: ISendMessage)=>MessageService.send(body),
    onError: () => {
      message.error("Произошла ошибка при отправке запроса");
    },
  });
};
