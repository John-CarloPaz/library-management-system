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
        <v-list-item prepend-avatar="https://randomuser.me/api/portraits/men/85.jpg" class="ml-1 my-2" nav>
            <template v-slot:title>
                <div id="user-info">
                    <p class="text-subtitle-1 font-weight-bold text-grey-darken-3 mb-0">{{ session ? session.name : 'Guest' }}</p>
                    <p class="text-subtitle-2 text-grey-darken-2 mt-0">{{ session ? session.email : '' }}</p>
                </div>

            </template>
        </v-list-item>
        <v-divider></v-divider>

        <v-list density="compact" nav>
            <v-list-item v-for="(navigation, index) in visibleNavigations" :key="index" :prepend-icon="navigation.icon" :value="navigation.title" :to="navigation.to" :class="{ 'nav-active': isActive(navigation) }">
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import usePermission from '@/composables/usePermission'
const drawer = ref(true)
const rail = ref(true)

export default {
    name: 'Navigation',
    data() {
        return {
            logo,
            navigations: [
                { icon: 'fa-book', title: 'Dashboard', to: '/home' },
                { icon: 'fa-cogs', title: 'Branch Management', to: '/branch-management' },
                { icon: 'fa-user-tie', title: 'Admin Management', to: '/admin-management' },
                { icon: 'fa-users', title: 'Student Management', to: '/student-management' },
                {icon: 'fa-list-check', title: 'Procurement', to: '/' },
                {icon: 'fa-hand-holding-hand', title: 'Acquisition', to: '/' },
                { icon: 'fa-book-open', title: 'Manage Books', to: '/manage-books' },
                { icon: 'fa-id-card', title: 'Borrow Books', to: '/borrow-books' },
                { icon: 'fa-handshake-simple', title: 'Return Books', to: '/return-books' },
                { icon: 'fa-receipt', title: 'Records', to: '/records' },
            ],
        }
    },
    setup() {
        const router = useRouter()

        const { session, role, can } = usePermission()

        // reactive logged-in flag
        const isLoggedIn = computed(() => !!(session && session.value))

        const logout = () => {
            try {
                localStorage.removeItem('app_session')
            } catch (e) {
                // ignore
            }
            // notify same-tab listeners and other tabs
            try { window.dispatchEvent(new Event('storage')) } catch(e) {}
            router.push({ name: 'login' })
        }

        // Return drawer/rail and permission helpers + logout. Visible navigation list computed in the options API section.
        return { drawer, rail, session, role, can, logout, isLoggedIn }
    },
    computed: {
        visibleNavigations() {
            const r = this.role
            const allowedBasic = ['Dashboard', 'Manage Books', 'Borrow Books', 'Return Books']
            if (!r) return []
            if (r === 'super_admin') return this.navigations
            if (r === 'branch_admin' || r === 'admin') {
                return this.navigations.filter(n => allowedBasic.includes(n.title))
            }
            return []
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