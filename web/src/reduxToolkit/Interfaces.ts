import { IMessage } from '@/components/ui/chatList/messageSection/MessageSection'

export interface IInitialState {
  theme: TTheme,
  messages: IMessage[]
}

export type TTheme = 'light'|'dark'
