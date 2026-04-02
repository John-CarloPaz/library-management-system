<template>
    <v-app-bar flat class="border-b" elevation="0">
        <v-row class="d-flex align-center justify-space-around">
            <v-col class="ml-4">
                <v-app-bar-title>{{ title }}</v-app-bar-title>
                <BreadCrumbs />
            </v-col>

            <v-col>
                <div>
                    <slot name="search-actions"></slot>
                </div>
            </v-col>

            <v-col class="d-flex justify-end mr-4">
                <div>
                    <slot name="button-actions"></slot>
                    <template v-if="isSuperAdmin">
                        <v-btn icon size="x-small" variant="tonal" class="ml-5 mr-2" @click="showCreateDialog = true"
                            aria-label="Create Announcement">
                            <v-icon icon="fa-globe" color="grey-darken-3"></v-icon>
                        </v-btn>
                        <CreateAnnouncement v-model="showCreateDialog" @created="onAnnouncementCreated" />
                    </template>
                    <v-btn icon="fa-bell" size="x-small" variant="tonal" class="ml-2 mr-2"
                        @click="showNotifDialog = true">
                        <v-icon :icon="'fa-bell'" :color="unreadCount > 0 ? 'red' : 'grey-darken-3'" />
                    </v-btn>
                    <v-dialog v-model="showNotifDialog" max-width="400">
                        <v-card>
                            <v-card-title>Notifications</v-card-title>
                            <v-card-text>
                                <v-list>
                                    <template v-if="sortedUnread.length > 0">
                                        <v-subheader>Unread</v-subheader>
                                        <template v-for="(notif, idx) in sortedUnread.slice(0, MAX_ITEMS)"
                                            :key="notif.id">
                                            <v-list-item @click="handleNotifClick(notif)"
                                                :class="{ 'notification-unread': !notif.is_read,}">
                                                <v-list-item-content>
                                                    <v-list-item-title>{{ notif.title }}</v-list-item-title>
                                                    <v-list-item-subtitle>
                                                        {{ notif.message }}
                                                        <div class="text-caption grey--text">{{ notif.created_at ? new
                                                            Date(notif.created_at).toLocaleString() : '-' }}</div>
                                                    </v-list-item-subtitle>
                                                </v-list-item-content>
                                            </v-list-item>
                                            <v-divider v-if="idx < Math.min(sortedUnread.length, MAX_ITEMS) - 1"
                                                class="mx-0 my-2" style="width:100%" />
                                        </template>
                                    </template>

                                    <v-divider v-if="sortedUnread.length > 0 && recentOthers.length > 0" class="my-4"></v-divider>

                                    <template v-if="recentOthers.length > 0">
                                        <v-subheader>Recent</v-subheader>
                                        <template v-for="(notif, idx) in recentOthers.slice(0, MAX_ITEMS)"
                                            :key="notif.id">
                                            <v-list-item @click="handleNotifClick(notif)"
                                                :class="{ 'notification-unread': !notif.is_read }">
                                                <v-list-item-content>
                                                    <v-list-item-title>{{ notif.title }}</v-list-item-title>
                                                    <v-list-item-subtitle>
                                                        {{ notif.message }}
                                                        <div class="text-caption grey--text">{{ notif.created_at ? new
                                                            Date(notif.created_at).toLocaleString() : '-' }}</div>
                                                    </v-list-item-subtitle>
                                                </v-list-item-content>
                                            </v-list-item>
                                            <v-divider v-if="idx < Math.min(recentOthers.length, MAX_ITEMS) - 1"
                                                class="mx-0 my-2" style="width:100%" />
                                        </template>
                                    </template>
                                    <template v-if="sortedUnread.length === 0 && recentOthers.length === 0">
                                        <v-list-item>
                                            <v-list-item-content>
                                                <v-list-item-title>No notifications</v-list-item-title>
                                            </v-list-item-content>
                                        </v-list-item>
                                    </template>
                                </v-list>
                            </v-card-text>
                            <v-card-actions>
                                <v-spacer />
                                <v-btn text @click="showNotifDialog = false">Close</v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-dialog>

                    <v-dialog v-model="showNotifMessageDialog" max-width="400">
                        <v-card>
                            <v-card-title>{{ selectedNotif?.title }}</v-card-title>
                            <v-card-text>{{ selectedNotif?.message }}</v-card-text>
                            <v-card-actions>
                                <v-spacer />
                                <v-btn text @click="showNotifMessageDialog = false">Close</v-btn>
                            </v-card-actions>
                        </v-card>
                    </v-dialog>
                    <!-- Removed comment icon -->
                </div>
            </v-col>

        </v-row>

    </v-app-bar>
</template>

<script setup>
import BreadCrumbs from './BreadCrumbs.vue';
import { ACTIONS, can as canCheck, requirePermission } from '@/services/permission';
import { ref, onMounted, computed } from 'vue'
import CreateAnnouncement from './CreateAnnouncement.vue'
import { getSession } from '@/services/auth'
import { fetchUnreadCount, fetchNotifications, markRead } from '@/services/notification'
import eventBus from '@/utils/eventBus'

const props = defineProps({
    title: {
        type: String,
        required: true,
    }
})

const canArchive = canCheck(ACTIONS.ARCHIVE)
const canEdit = canCheck(ACTIONS.EDIT)
const canCreate = canCheck(ACTIONS.CREATE)
const canNotif = canCheck(ACTIONS.NOTIF)

const isSuperAdmin = computed(() => {
    const s = getSession()
    return s && s.role === 'super_admin'
})

const unreadCount = ref(Number(localStorage.getItem('unreadCount') || 0))
const unreadNotifications = ref([])
const recentNotifications = ref([])
const showNotifDialog = ref(false)
const showNotifMessageDialog = ref(false)
const selectedNotif = ref(null)
const loadingUnread = ref(false)
const showCreateDialog = ref(false)

const onAnnouncementCreated = () => {
    // refresh lists when new announcement is created
    loadUnread()
    loadRecentNotifications()
}

const loadUnread = async () => {
    try {
        const res = await fetchNotifications({ unreadOnly: true, perPage: 50 })
        unreadNotifications.value = Array.isArray(res.data) ? res.data : []
        const newCount = Array.isArray(unreadNotifications.value) ? unreadNotifications.value.length : 0
        if (unreadCount.value !== newCount) {
            unreadCount.value = newCount
            try { localStorage.setItem('unreadCount', String(newCount)) } catch (e) { }
        }
    } catch (e) {
        // keep existing unreadCount on error to avoid flicker
    }
}

const loadRecentNotifications = async () => {
    try {
        const res = await fetchNotifications({ perPage: 50 })
        const items = Array.isArray(res.data) ? res.data : []
        // sort newest first by created_at (fallback to id)
        items.sort((a, b) => {
            const ta = a.created_at ? new Date(a.created_at).getTime() : 0
            const tb = b.created_at ? new Date(b.created_at).getTime() : 0
            return tb - ta || (b.id || 0) - (a.id || 0)
        })
        recentNotifications.value = items
    } catch (e) {
        recentNotifications.value = []
    }
}

const MAX_ITEMS = 3

const sortedUnread = computed(() => {
    const arr = Array.isArray(unreadNotifications.value) ? [...unreadNotifications.value] : []
    arr.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0
        return tb - ta || (b.id || 0) - (a.id || 0)
    })
    return arr
})

const recentOthers = computed(() => {
    const unreadIds = new Set((unreadNotifications.value || []).map(n => n.id))
    const arr = Array.isArray(recentNotifications.value) ? recentNotifications.value.filter(n => !unreadIds.has(n.id)) : []
    return arr
})


import { useRouter } from 'vue-router'
const router = useRouter()

const openNotifMessage = async (notif) => {
    selectedNotif.value = notif
    showNotifMessageDialog.value = true
    if (!notif.is_read) {
        await markRead(notif.id)
        notif.is_read = true
        eventBus.emit('notification-read', notif.id)
        loadUnread()
    }
}

const handleNotifClick = async (notif) => {
    if (notif.type === 'chat' && notif.data?.chat_id) {
        if (!notif.is_read) {
            await markRead(notif.id)
            notif.is_read = true
            eventBus.emit('notification-read', notif.id)
            loadUnread()
        }
        router.push({ name: 'chat', query: { chatId: notif.data.chat_id } })
        showNotifDialog.value = false
    } else {
        openNotifMessage(notif)
    }
}

onMounted(() => {
    loadUnread()
    loadRecentNotifications()
    eventBus.on('notification-read', () => { loadUnread(); loadRecentNotifications(); })
    // Laravel Echo realtime notification subscription
    const session = getSession()
    console.log('[DEBUG] Echo setup. Session:', session)
    if (window.Echo) {
        if (session && session.id) {
            const channelName = `private-notifications.${session.id}`
            console.log('[DEBUG] Subscribing to Echo channel:', channelName)
            window.Echo.private(channelName)
                .listen('.notification.created', (data) => {
                    console.log('[DEBUG] Received .notification.created event:', data)
                    loadUnread()
                })
        } else {
            console.warn('[DEBUG] No session or session.id for Echo subscription')
        }
    } else {
        console.warn('[DEBUG] window.Echo is not available')
    }
})
</script>
