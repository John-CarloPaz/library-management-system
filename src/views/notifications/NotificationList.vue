<template>
  <AppBar title="Notifications" @create-announcement="showAnnouncementDialog = true" />
  <v-container class="mt-8">
    <v-row justify="center">
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Notifications</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item
                v-for="n in notifications"
                :key="n.id"
                :class="{ 'notification-unread': !n.is_read }"
                @click="handleNotificationClick(n)"
              >
                <v-list-item-content>
                  <v-list-item-title>{{ n.title }}</v-list-item-title>
                  <v-list-item-subtitle>{{ n.message }}</v-list-item-subtitle>
                  <div v-if="n.data && n.type === 'chat'" class="text-caption grey--text">Chat ID: {{ n.data.chat_id }}</div>
                  <div v-if="n.data && n.type === 'procurement'" class="text-caption grey--text">Procurement: {{ n.data.title }}</div>
                  <div v-if="n.type === 'announcement'" class="text-caption blue--text">Announcement</div>
                </v-list-item-content>
                <v-list-item-action>
                  <v-btn icon @click.stop="markAsRead(n)">
                    <v-icon>fa-check</v-icon>
                  </v-btn>
                </v-list-item-action>
              </v-list-item>
            </v-list>
            <v-pagination
              v-model="page"
              :length="totalPages"
              class="mt-4"
              @input="fetchPage"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-dialog v-model="showAnnouncementDialog" max-width="500">
      <v-card>
        <v-card-title>New Announcement</v-card-title>
        <v-card-text>
          <v-form ref="announcementForm" @submit.prevent="submitAnnouncement">
            <v-text-field v-model="announcement.title" label="Title" required />
            <v-textarea v-model="announcement.message" label="Message" required />
            <v-select v-model="announcement.scope" :items="scopeOptions" label="Scope" required />
            <v-select
              v-if="announcement.scope === 'branches'"
              v-model="announcement.branch_ids"
              :items="branchOptions"
              label="Branches"
              multiple
              chips
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showAnnouncementDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitAnnouncement">Send</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import AppBar from '@/components/AppBar.vue'
import { fetchNotifications, fetchUnreadCount, markRead, createAnnouncement } from '@/services/notification'
import eventBus from '@/utils/eventBus'
import { getSession } from '@/services/auth'
import { listActiveBranches } from '@/services/branch'

export default {
  name: 'NotificationList',
  components: { AppBar },
  data() {
    return {
      notifications: [],
      page: 1,
      perPage: 20,
      total: 0,
      showAnnouncementDialog: false,
      announcement: { title: '', message: '', scope: 'all', branch_ids: [] },
      scopeOptions: [
        { value: 'all', title: 'All Users' },
        { value: 'branches', title: 'Selected Branches' },
      ],
      branchOptions: [],
    }
  },
  computed: {
    totalPages() {
      return Math.ceil(this.total / this.perPage)
    },
    isSuperAdmin() {
      const session = getSession()
      return session && session.role === 'super_admin'
    },
  },
  created() {
    this.fetchPage()
    if (this.isSuperAdmin) this.loadBranches()
  },
  methods: {
    async fetchPage() {
      const res = await fetchNotifications({ page: this.page, perPage: this.perPage })
      this.notifications = res.data || []
      this.total = res.total || 0
    },
    async markAsRead(n) {
      if (!n.is_read) {
        await markRead(n.id)
        n.is_read = true
        eventBus.emit('notification-read', n.id)
      }
    },
    handleNotificationClick(n) {
      this.markAsRead(n)
      // Route based on type
      if (n.type === 'chat' && n.data?.chat_id) {
        this.$router.push({ name: 'chat', query: { chatId: n.data.chat_id } })
      } else if (n.type === 'procurement' && n.data?.procurement_id) {
        this.$router.push({ name: 'view-procurement', params: { id: n.data.procurement_id } })
      } else if (n.type === 'announcement') {
        // Optionally show modal/banner
      }
    },
    async submitAnnouncement() {
      if (!this.announcement.title || !this.announcement.message || !this.announcement.scope) return
      await createAnnouncement(this.announcement)
      this.showAnnouncementDialog = false
      this.announcement = { title: '', message: '', scope: 'all', branch_ids: [] }
      this.fetchPage()
    },
    async loadBranches() {
      const branches = await listActiveBranches()
      this.branchOptions = branches.map(b => ({ value: b.id, title: b.name }))
    },
  },
}
</script>

<style scoped>
.notification-unread {
  background: #e3f2fd;
}
</style>
