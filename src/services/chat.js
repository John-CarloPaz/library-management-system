import { getAxiosInstance } from './auth'

const api = () => getAxiosInstance()

export async function listChats() {
  const response = await api().get('/chat/chats')
  return response.data || { chats: [] }
}

export async function openOrCreateChat(recipientId) {
  if (!recipientId) {
    throw new Error('recipientId is required')
  }
  const response = await api().post('/chat/chats', { recipient_id: recipientId })
  return response.data
}

export async function getChatMessages(chatId, { perPage = 25, page = 1 } = {}) {
  if (!chatId) {
    throw new Error('chatId is required')
  }
  const response = await api().get(`/chat/chats/${chatId}/messages`, {
    params: { per_page: perPage, page },
  })
  return response.data
}

export async function sendChatMessage(chatId, message) {
  if (!chatId) {
    throw new Error('chatId is required')
  }
  if (!message || !message.trim()) {
    throw new Error('Message cannot be empty')
  }
  const response = await api().post(`/chat/chats/${chatId}/messages`, { message })
  return response.data
}
