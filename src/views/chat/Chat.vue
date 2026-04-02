<template>
  <AppBar title="Chat">
    <template #button-actions>
      <v-btn variant="tonal" prepend-icon="fa-plus" @click="openNewChatDialog">
        New Chat
      </v-btn>
    </template>
  </AppBar>

  <v-container class="mt-6" fluid>
    <v-row>
      <!-- Conversations list -->
      <v-col cols="12" md="4">
        <v-card class="chat-panel" elevation="1">
          <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center justify-space-between">
            <span>Conversations</span>
            <v-progress-circular v-if="loadingChats" indeterminate size="18" width="2" />
          </v-card-title>
          <v-divider />

          <v-card-text class="pa-0">
            <v-list density="compact" nav class="chat-list">
              <v-list-item
                v-for="chat in chats"
                :key="chat.id"
                :class="['chat-list-item', { 'chat-list-item--active': activeChat && chat.id === activeChat.id }]"
                @click="selectChat(chat)"
              >
                <template #prepend>
                  <v-avatar color="blue-lighten-4" size="36">
                    <span class="text-blue-darken-3 font-weight-bold text-caption">
                      {{ getChatInitial(chat) }}
                    </span>
                  </v-avatar>
                </template>

                <v-list-item-title class="text-body-2 font-weight-medium">
                  {{ getChatTitle(chat) }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption text-truncate">
                  {{ getLastMessagePreview(chat) }}
                </v-list-item-subtitle>

                <template #append>
                  <span v-if="getLastMessageTime(chat)" class="text-caption text-grey-darken-1">
                    {{ getLastMessageTime(chat) }}
                  </span>
                </template>
              </v-list-item>

              <div v-if="!loadingChats && chats.length === 0" class="pa-4 text-center text-caption text-grey-darken-1">
                No conversations yet. Start a new chat.
              </div>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Messages panel -->
      <v-col cols="12" md="8">
        <v-card class="chat-panel" elevation="1">
          <v-card-title class="d-flex align-center justify-space-between">
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ activeChat ? getChatTitle(activeChat) : 'Select a conversation' }}
              </div>
              <div v-if="activeChat" class="text-caption text-grey-darken-1">
                1-on-1 chat
              </div>
            </div>
          </v-card-title>
          <v-divider />

          <v-card-text class="chat-messages" ref="messagesContainer">
            <div v-if="loadingMessages" class="d-flex justify-center pa-4">
              <v-progress-circular indeterminate />
            </div>

            <div v-if="!loadingMessages && activeChat && canLoadMore" class="d-flex justify-center mb-2">
              <v-btn size="x-small" variant="text" @click="loadOlderMessages" :disabled="loadingOlder">
                <v-progress-circular v-if="loadingOlder" indeterminate size="14" width="2" class="mr-1" />
                Load older messages
              </v-btn>
            </div>

            <div v-if="!activeChat && !loadingMessages" class="pa-4 text-center text-caption text-grey-darken-1">
              Select a conversation or start a new chat.
            </div>

            <div v-for="msg in messages" :key="msg.id" class="mb-2">
              <div :class="['chat-bubble-row', { 'chat-bubble-row--me': isMe(msg) }]"><!-- alignment -->
                <div class="chat-bubble" :class="isMe(msg) ? 'chat-bubble--me' : 'chat-bubble--other'">
                  <div class="chat-bubble-meta text-caption mb-1">
                    <span class="font-weight-medium">{{ getMessageAuthor(msg) }}</span>
                    <span class="text-grey-darken-1 ml-2">{{ formatTimestamp(msg.created_at) }}</span>
                  </div>
                  <div class="chat-bubble-text text-body-2">
                    {{ msg.message }}
                  </div>
                </div>
              </div>
            </div>
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-textarea
              v-model="newMessage"
              :disabled="!activeChat || sending"
              placeholder="Type a message..."
              variant="outlined"
              auto-grow
              max-rows="3"
              rows="1"
              class="flex-grow-1 mr-2"
              density="comfortable"
              @keydown.enter.exact.prevent="handleEnter"
            />
            <v-btn
              color="primary"
              :disabled="!activeChat || sending || !newMessage.trim()"
              @click="send"
              prepend-icon="fa-paper-plane"
            >
              Send
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <!-- New chat dialog -->
  <v-dialog v-model="newChatDialog" max-width="480">
    <v-card>
      <v-card-title class="text-subtitle-1 font-weight-bold">
        Start New Chat
      </v-card-title>
      <v-card-text>
        <v-autocomplete
          v-model="selectedRecipientId"
          :items="adminOptions"
          :loading="loadingAdmins"
          item-title="label"
          item-value="id"
          label="Select admin"
          variant="outlined"
          density="comfortable"
          clearable
          hide-details="auto"
        />
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="newChatDialog = false">Cancel</v-btn>
        <v-btn
          color="primary"
          :disabled="!selectedRecipientId || creatingChat"
          @click="createChat"
        >
          <v-progress-circular v-if="creatingChat" indeterminate size="16" width="2" class="mr-1" />
          Start
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Error dialog -->
  <ErrorDialog
    :visible.sync="dialog.visible"
    :title="dialog.title"
    :message="dialog.message"
    :isError="dialog.isError"
    @update:visible="dialog.visible = $event"
  />
</template>

<script>
import AppBar from '@/components/AppBar.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { listChats, openOrCreateChat, getChatMessages, sendChatMessage } from '@/services/chat'
import { fetchAdminsPage } from '@/services/admin'
import { getSession } from '@/services/auth'
import { subscribeToChat } from '@/services/realtime'

export default {
  name: 'chat',
  components: { AppBar, ErrorDialog },
  data() {
    return {
      chats: [],
      activeChat: null,
      loadingChats: false,
      messages: [],
      loadingMessages: false,
      loadingOlder: false,
      sending: false,
      newMessage: '',
      pagination: {
        currentPage: 1,
        lastPage: 1,
        perPage: 25,
      },
      newChatDialog: false,
      adminOptions: [],
      loadingAdmins: false,
      selectedRecipientId: null,
      creatingChat: false,
      dialog: {
        visible: false,
        title: '',
        message: '',
        isError: false,
      },
      unsubscribeFn: null,
      currentUserId: getSession()?.id || null,
    }
  },
  computed: {
    canLoadMore() {
      return this.pagination.currentPage < this.pagination.lastPage
    },
  },
  mounted() {
    this.loadChats()
  },
  beforeUnmount() {
    if (typeof this.unsubscribeFn === 'function') {
      this.unsubscribeFn()
    }
  },
  methods: {
    async loadChats() {
      this.loadingChats = true
      try {
        const data = await listChats()
        this.chats = Array.isArray(data.chats) ? data.chats : []
        if (!this.activeChat && this.chats.length > 0) {
          this.selectChat(this.chats[0])
        }
      } catch (error) {
        console.error('Failed to load chats:', error)
        this.showError('Load Failed', error.message || 'Failed to load chats.')
      } finally {
        this.loadingChats = false
      }
    },
    async selectChat(chat) {
      if (!chat || !chat.id) return
      if (this.activeChat && this.activeChat.id === chat.id) return

      this.activeChat = chat
      this.messages = []
      this.pagination.currentPage = 1

      if (typeof this.unsubscribeFn === 'function') {
        this.unsubscribeFn()
        this.unsubscribeFn = null
      }

      await this.loadMessages(chat.id, 1)
      this.subscribe(chat.id)
    },
    async loadMessages(chatId, page = 1) {
      this.loadingMessages = page === 1
      this.loadingOlder = page > 1
      try {
        const data = await getChatMessages(chatId, { perPage: this.pagination.perPage, page })
        const chat = data.chat
        const messagesPayload = data.messages || {}
        const pageData = Array.isArray(messagesPayload.data) ? messagesPayload.data : []
        const ordered = [...pageData].reverse()

        this.activeChat = chat || this.activeChat
        this.pagination.currentPage = messagesPayload.current_page || page
        this.pagination.lastPage = messagesPayload.last_page || page

        if (page === 1) {
          this.messages = ordered
        } else {
          this.messages = [...ordered, ...this.messages]
        }

        this.$nextTick(() => this.scrollToBottom())
      } catch (error) {
        console.error('Failed to load messages:', error)
        this.showError('Load Failed', error.message || 'Failed to load messages.')
      } finally {
        this.loadingMessages = false
        this.loadingOlder = false
      }
    },
    loadOlderMessages() {
      if (!this.activeChat || !this.canLoadMore || this.loadingOlder) return
      const nextPage = (this.pagination.currentPage || 1) + 1
      this.loadMessages(this.activeChat.id, nextPage)
    },
    subscribe(chatId) {
      this.unsubscribeFn = subscribeToChat(chatId, (event) => {
        if (!event || !event.id) return
        const exists = this.messages.some((m) => m.id === event.id)
        if (!exists) {
          this.messages.push(event)
          this.$nextTick(() => this.scrollToBottom())
        }
        // Refresh chat list ordering/latest message
        this.loadChats()
      })
    },
    async send() {
      if (!this.activeChat || !this.newMessage.trim()) return
      const text = this.newMessage.trim()
      this.sending = true
      try {
        const data = await sendChatMessage(this.activeChat.id, text)
        const msg = data.chat_message
        if (msg && !this.messages.some((m) => m.id === msg.id)) {
          this.messages.push(msg)
          this.$nextTick(() => this.scrollToBottom())
        }
        this.newMessage = ''
      } catch (error) {
        console.error('Failed to send message:', error)
        this.showError('Send Failed', error.message || 'Failed to send message.')
      } finally {
        this.sending = false
      }
    },
    handleEnter() {
      if (!this.newMessage.trim() || this.sending) return
      this.send()
    },
    openNewChatDialog() {
      this.newChatDialog = true
      this.selectedRecipientId = null
      if (!this.adminOptions.length) {
        this.loadAdmins()
      }
    },
    async loadAdmins() {
      this.loadingAdmins = true
      try {
        const { items } = await fetchAdminsPage({ page: 1, itemsPerPage: 50 })
        const currentId = this.currentUserId
        this.adminOptions = (items || [])
          .filter((u) => u.id !== currentId)
          .map((u) => ({
            id: u.id,
            label: `${u.username || u.name || u.email} (${u.role || 'admin'})`,
          }))
      } catch (error) {
        console.error('Failed to load admins for chat:', error)
        this.showError('Load Failed', error.message || 'Failed to load admins for chat.')
      } finally {
        this.loadingAdmins = false
      }
    },
    async createChat() {
      if (!this.selectedRecipientId) return
      this.creatingChat = true
      try {
        const data = await openOrCreateChat(this.selectedRecipientId)
        const chat = data.chat
        if (chat) {
          const exists = this.chats.some((c) => c.id === chat.id)
          if (!exists) {
            this.chats.unshift(chat)
          }
          this.newChatDialog = false
          await this.selectChat(chat)
        }
      } catch (error) {
        console.error('Failed to start chat:', error)
        this.showError('Start Failed', error.message || 'Failed to start chat.')
      } finally {
        this.creatingChat = false
      }
    },
    getChatTitle(chat) {
      if (!chat) return ''
      if (chat.name) return chat.name
      const users = Array.isArray(chat.users) ? chat.users : []
      if (!users.length) return 'Chat'
      const other = users.find((u) => u.id !== this.currentUserId) || users[0]
      return other.username || other.name || other.email || `User #${other.id}`
    },
    getChatInitial(chat) {
      const title = this.getChatTitle(chat)
      return title ? title.charAt(0).toUpperCase() : '?'
    },
    getLastMessagePreview(chat) {
      const messages = Array.isArray(chat.messages) ? chat.messages : []
      if (!messages.length) return 'No messages yet'
      const latest = messages[0]
      return latest.message && latest.message.length > 40
        ? `${latest.message.substring(0, 40)}…`
        : latest.message
    },
    getLastMessageTime(chat) {
      const messages = Array.isArray(chat.messages) ? chat.messages : []
      if (!messages.length) return ''
      return this.formatTimestamp(messages[0].created_at)
    },
    isMe(msg) {
      return msg && Number(msg.user_id) === Number(this.currentUserId)
    },
    getMessageAuthor(msg) {
      if (this.isMe(msg)) return 'You'
      const user = msg.user || {}
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')
      return fullName || user.username || user.email || `User #${user.id}`
    },
    formatTimestamp(ts) {
      if (!ts) return ''
      const date = new Date(ts)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    scrollToBottom() {
      try {
        const el = this.$refs.messagesContainer?.$el || this.$refs.messagesContainer
        if (el && el.scrollHeight != null) {
          el.scrollTop = el.scrollHeight
        }
      } catch (e) {
        // ignore
      }
    },
    showError(title, message) {
      this.dialog = {
        visible: true,
        title,
        message,
        isError: true,
      }
    },
  },
}
</script>

<style scoped>
.chat-panel {
  border-radius: 16px;
  overflow: hidden;
}

.chat-list {
  max-height: 520px;
  overflow-y: auto;
}

.chat-list-item {
  cursor: pointer;
}

.chat-list-item--active {
  background-color: #e3f2fd;
}

.chat-messages {
  min-height: 260px;
  max-height: 520px;
  overflow-y: auto;
  background: #fafafa;
}

.chat-bubble-row {
  display: flex;
  justify-content: flex-start;
}

.chat-bubble-row--me {
  justify-content: flex-end;
}

.chat-bubble {
  max-width: 75%;
  padding: 8px 12px;
  border-radius: 12px;
}

.chat-bubble--me {
  background-color: #1976d2;
  color: white;
}

.chat-bubble--other {
  background-color: white;
  border: 1px solid #e0e0e0;
}

.chat-bubble-meta {
  opacity: 0.8;
}

.chat-bubble-text {
  white-space: pre-wrap;
}
</style>
