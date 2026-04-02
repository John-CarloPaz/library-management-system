<template>
    <v-navigation-drawer v-if="isLoggedIn" app v-model="drawer" :rail="rail" permanent @click="rail = false" width="300">
        <v-list-item :prepend-avatar="logo" class="ml-1 mb-2"nav>
            <p class="text-h6 text-blue-darken-4 font-weight-black">SPCF Library</p>
            <template v-slot:append>
                <v-btn icon variant="text" @click.stop="rail = !rail">
                    <v-avatar rounded="circle" icon="fa-chevron-left" class="fa-xs"></v-avatar>
                </v-btn>
            </template>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item class="ml-0 my-1" nav>
            <template #prepend>
                <v-avatar color="blue-lighten-1" size="40">
                    <span class="text-white font-weight-bold">{{ userInitial }}</span>
                </v-avatar>
            </template>
            <template #title>
                <div id="user-info">
                    <p class="text-subtitle-1 font-weight-bold text-grey-darken-3 mb-0">{{ session && session.name ? session.name : (session && session.username ? session.username : 'Guest') }}</p>
                    <p class="text-subtitle-2 text-grey-darken-2 mt-0">{{ session && session.email ? session.email : '' }}</p>
                </div>

            </template>
        </v-list-item>
        <v-divider></v-divider>


        <v-list density="compact" nav>
            <v-list-item
                v-for="(navigation, index) in visibleNavigations"
                :key="index"
                :prepend-icon="navigation.icon"
                :value="navigation.title"
                :to="navigation.to"
                :class="{ 'nav-active': isActive(navigation) }"
            >
                <template v-slot:prepend>
                    <v-badge
                        v-if="navigation.title === 'Notifications' && unreadCount > 0"
                        :content="unreadCount > 99 ? '99+' : unreadCount"
                        color="red"
                        overlap
                        bordered
                        offset-x="8"
                        offset-y="-8"
                    >
                        <v-icon :icon="navigation.icon"></v-icon>
                    </v-badge>
                    <v-icon v-else :icon="navigation.icon"></v-icon>
                </template>
                <template v-slot:title>
                    <p class="text-subtitle-1 text-grey-darken-2 font-weight-bold mb-0">{{ navigation.title }}</p>
                </template>
            </v-list-item>
        </v-list>

        <div class="nav-footer">
            <div class="pa-3 d-flex justify-center">
                <v-tooltip v-if="rail">
                    <template #activator="{ props }">
                        <v-btn v-bind="props" icon variant="plain" color="error" @click="logout" aria-label="Logout">
                            <v-icon icon="fa-sign-out-alt"></v-icon>
                        </v-btn>
                    </template>
                    <span>Logout</span>
                </v-tooltip>

                <v-btn v-else block variant="tonal" color="error" @click="logout" prepend-icon="fa-sign-out-alt">
                    Logout
                </v-btn>
            </div>
        </div>
    </v-navigation-drawer>
</template>

<script>
import logo from '../assets/spcf-logo.png'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import usePermission from '@/composables/usePermission'

import { fetchUnreadCount } from '@/services/notification'
import eventBus from '@/utils/eventBus'

// Echo import (assume global or via plugin, otherwise import Echo from 'laravel-echo')

import { logout as authLogout } from '@/services/auth'

const drawer = ref(true)
const rail = ref(true)

export default {
    name: 'Navigation',
    data() {
        return {
            logo,
            navigations: [
                { icon: 'fas fa-book', title: 'Dashboard', to: '/home' },
                { icon: 'fas fa-user-cog', title: 'Account', to: '/account' },
                { icon: 'fas fa-comments', title: 'Chat', to: '/chat' },
                { icon: 'fas fa-cogs', title: 'Branch Management', to: '/branch' },
                { icon: 'fas fa-user-tie', title: 'Admin Management', to: '/admin-management' },
                { icon: 'fas fa-users', title: 'Member Management', to: '/member-management' },
                { icon: 'fas fa-calendar-day', title: 'Semesters', to: '/semesters' },
                { icon: 'fas fa-list-check', title: 'Procurement', to: '/procurement' },
                { icon: 'fas fa-hand-holding-hand', title: 'Acquisition', to: '/acquisition' },
                { icon: 'fas fa-folder', title: 'Catalogue', to: '/catalogue' },
                { icon: 'fas fa-book-open', title: 'Manage Books', to: '/manage-books' },
                { icon: 'fas fa-id-card', title: 'Borrow Books', to: '/borrow-books' },
                { icon: 'fas fa-handshake-simple', title: 'Return Books', to: '/return-books' },
                { icon: 'fas fa-clock-rotate-left', title: 'Extension', to: '/borrow-extensions' },
                { icon: 'fas fa-envelope', title: 'Emailed Reminders', to: '/borrow-reminders/emailed' },
                { icon: 'fas fa-receipt', title: 'Records', to: '/records' },
            ],
        }
    },
    setup() {
        const router = useRouter()
        const { session, role, can } = usePermission()
        const isLoggedIn = computed(() => !!(session && session.value))

        // Unread notification count
        const unreadCount = ref(0)

        // Fetch unread count
        const loadUnreadCount = async () => {
            try {
                unreadCount.value = await fetchUnreadCount()
            } catch (e) {
                unreadCount.value = 0
            }
        }

        // Echo realtime updates

        onMounted(() => {
            loadUnreadCount()
            // Echo integration (assume window.Echo is available)
            if (window.Echo && session && session.value && session.value.id) {
                window.Echo.private(`notifications.${session.value.id}`)
                    .listen('.notification.created', () => {
                        loadUnreadCount()
                    })
            }
            // Listen for global notification-read event
            eventBus.on('notification-read', loadUnreadCount)
        })

        // Expose a way for children to trigger unread count refresh (e.g., after marking as read)
        // Optionally, use provide/inject for global event bus if needed

        const logout = () => {
            authLogout()
            router.push({ name: 'login' })
        }

        return { drawer, rail, session, role, can, logout, isLoggedIn, unreadCount, loadUnreadCount }
    },
    computed: {
        visibleNavigations() {
            const r = this.role
            const session = this.session && this.session.value ? this.session.value : this.session || null
            const isDean = !!(session && session.employee_type === 'dean')

            const allowedBasic = ['Dashboard', 'Account', 'Chat', 'Manage Books', 'Member Management', 'Borrow Books', 'Return Books', 'Extension', 'Emailed Reminders', 'Catalogue', 'Records', 'Procurement']
            const allowedBranchAdmin = [...allowedBasic, 'Acquisition', 'Member Management', 'Admin Management']

            if (!r) return []
            if (r === 'super_admin') return this.navigations

            if (r === 'branch_admin') {
                return this.navigations.filter(n => allowedBranchAdmin.includes(n.title))
            }

            if (r === 'admin') {
                // Base allowed for generic admins
                let allowedTitles = [...allowedBasic]

                // Deans: hide some sections, but allow Acquisition (view-only enforced elsewhere)
                if (isDean) {
                    const deanBlocked = new Set(['Borrow Books', 'Return Books', 'Extension', 'Records'])
                    allowedTitles = allowedTitles.filter(title => !deanBlocked.has(title))
                    if (!allowedTitles.includes('Acquisition')) {
                        allowedTitles.push('Acquisition')
                    }
                }

                return this.navigations.filter(n => allowedTitles.includes(n.title))
            }

            return []
        },
        userInitial() {
            const s = this.session || null
            if (!s) return 'G'

            const source = (s.username || s.name || s.email || '').trim()
            if (!source) return 'U'

            return source.charAt(0).toUpperCase()
        },
    },
    methods: {
        isActive(navigation) {
            try {
                const to = navigation && navigation.to;
                const currentPath = this.$route && this.$route.path;
                // if `to` is a string path, compare directly
                if (typeof to === 'string') return currentPath === to;
                // if `to` is a route object with name, compare by name
                if (to && to.name) return this.$route && this.$route.name === to.name;
                return false;
            } catch (e) {
                return false;
            }
        },
    },
}
</script>

<style scoped>
    #user-info p {
        line-height: 1.2;
    }

.nav-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    background: transparent;
}
.nav-footer .v-btn {
    border-radius: 0;
}

/* Active navigation styling */
.nav-active {
    background-color: #e3f2fd;
}
.nav-active .text-subtitle-1,
.nav-active .v-list-item__title,
.nav-active .v-icon {
    color: #0960e2 !important;
}   
</style>