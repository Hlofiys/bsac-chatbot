import { useMutation } from "@tanstack/react-query";
import MessageService from "../services/message/Message.service";
import { message } from "antd";
import { AxiosError } from "axios";

export const useSendMessage = () => {
  return useMutation({
    mutationKey: ["sendMessage"],
    mutationFn: MessageService.send,
    onError: (err: AxiosError) => {
      message.error(err.message);
    },
  });
};
