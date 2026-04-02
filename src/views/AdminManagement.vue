<template>
    <AppBar title="Admin Management">
        <template #search-actions>
            <div>
                <v-text-field density="compact" v-model="filters.search" label="Search Name or ID" variant="solo-filled"
                    hide-details="auto" @input="applyFilters" style="max-width:360px;" prepend-inner-icon="fas fa-magnifying-glass" />
            </div>
        </template>

        <template #button-actions v-if="canCreate">
            <v-btn prepend-icon="fa-plus" variant="tonal" @click="addAdmin">Create Admin</v-btn>
        </template>
    </AppBar>

    <v-container fluid>
        <v-row>
            <v-col cols="12" class="mt-4">
                <ScopeTab
                    v-model="scope"
                    :scopes="adminScopes"
                />
            </v-col>
        </v-row>
        <v-row>
            <v-col cols="12" class="mt-4">
                <Table
                    :headers="adminHeaders"
                    :items="filteredAdmins"
                    :items-length="totalAdmins"
                    :loading="loading"
                    v-model:items-per-page="itemsPerPage"
                    item-key="employee_id"
                    @update:options="loadItems"
                >
                    <template #actions="{ item }">
                        <v-btn icon="fa-eye" size="x-small" variant="plain" @click.stop="viewAdmin(item)"></v-btn>
                        <v-btn v-if="canEditAdminRow(item)" icon="fa-pencil" size="x-small" variant="plain" @click.stop="editAdmin(item)"></v-btn>
                    </template>

                    <!-- Custom renderer for role column - uses Table's per-column slot bridge -->
                    <template #cell-role="{ item }">
                        <v-chip variant="elevated" color="purple" v-if="item.role === 'super_admin'" size="small">
                            <p class="text-capitalize">{{ prettyRole(item.role) }}</p>
                        </v-chip>
                        <v-chip variant="elevated" color="warning" v-else-if="item.role === 'branch_admin'"
                            size="small">
                            <p class="text-capitalize">{{ prettyRole(item.role) }}</p>
                        </v-chip>
                        <v-chip variant="elevated" color="info" size="small" v-else>
                            <p class="text-capitalize">{{ prettyRole(item.role) }}</p>
                        </v-chip>
                    </template>
                </Table>
                <div class="mt-4">
                    <span class="mr-1">Download:</span>
                    <a href="#" @click.prevent="onDownloadCsv">CSV</a>
                    <span class="mr-1">,</span>
                    <a href="#" @click.prevent="onDownloadJson">JSON</a>
                </div>
            </v-col>
        </v-row>
    </v-container>

    <!-- Filter Drawer -->
    <FilterDrawer
        v-model="filters"
        :filters="filterDrawerKeys"
        :statusOptions="roleOptions"
        :branchOptions="availableBranches"
        searchLabel="Name or ID or Username"
        @apply="onApplyFilters"
    />

    <ErrorDialog
        :visible.sync="dialog.visible"
        :title="dialog.title"
        :message="dialog.message"
        :isError="dialog.isError"
        @update:visible="dialog.visible = $event"
    />
</template>

<script>
import AppBar from '../components/AppBar.vue'
import Table from '@/components/Table.vue'
import FilterDrawer from '@/components/FilterDrawer.vue'
import ScopeTab from '@/components/ScopeTab.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { exportAsCsv, exportAsJson } from '@/services/export'
import { fetchAdminsPage, getAdmin, updateAdmin } from '@/services/admin'
import { listActiveBranches } from '@/services/branch'
import { ACTIONS, can as canCheck, requirePermission } from '@/services/permission'
import { filterByBranchIds } from '@/utils/filtering'
import { getSession } from '@/services/auth'

export default {
    name: 'admin-management',
    components: { AppBar, Table, FilterDrawer, ScopeTab, ErrorDialog },
    data() {
        return {
            loading: false,
            scope: 'active',
            suppressScopeWatcher: false,
            skipApplyAfterLoad: false,
            admins: [],
            filteredAdmins: [],
            totalAdmins: 0,
            itemsPerPage: 10,
            tableOptions: {
                page: 1,
                itemsPerPage: 10,
                sortBy: [],
            },
            branches: [],
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: true,
            },
            filters: {
                search: '',
                status: [],
                method: [],
                branch: [],
                dateAcquired: '',
                dateAddedFrom: '',
                dateAddedTo: '',
            },
            roleOptions: [
                { value: 'super_admin', title: 'Super Admin' },
                { value: 'branch_admin', title: 'Branch Admin' },
                { value: 'librarian', title: 'Librarian' },
            ],
            adminScopes: [
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
            ],
            adminHeaders: [
                { text: 'ID', value: 'employee_id' },
                { text: 'Name', value: 'username' },
                { text: 'First Name', value: 'first_name' },
                { text: 'Last Name', value: 'last_name' },
                { text: 'Email', value: 'email' },
                { text: 'Branch', value: 'branch_name' },
                { text: 'Role', value: 'role' },
                { text: 'Actions', value: 'actions', sortable: false },
            ],
            canCreate: canCheck(ACTIONS.CREATE),
            canArchive: canCheck(ACTIONS.ARCHIVE),
        }
    },
    computed: {
        session() {
            try { return getSession() || null } catch (e) { return null }
        },
        role() {
            return this.session && this.session.role ? String(this.session.role).toLowerCase() : ''
        },
        isBranchAdmin() {
            return this.role === 'branch_admin'
        },
        sessionBranchId() {
            const raw = this.session && this.session.branch_id != null ? this.session.branch_id : null
            const n = raw != null ? Number(raw) : null
            return Number.isFinite(n) ? n : raw
        },
        filterDrawerKeys() {
            // Branch admins are always scoped to their own branch; don't expose a branch switcher.
            return this.isBranchAdmin
                ? ['search', 'status', 'dateAddedRange']
                : ['search', 'status', 'branch', 'dateAddedRange']
        },
        availableBranches() {
            if (!this.isBranchAdmin) return this.branches
            const id = this.sessionBranchId
            if (id == null) return []
            return (Array.isArray(this.branches) ? this.branches : []).filter(b => Number(b.id) === Number(id))
        },
    },
    watch: {
        scope() {
            // Allow controlled suppression when changing scope programmatically
            if (this.suppressScopeWatcher) {
                this.suppressScopeWatcher = false
                return
            }

            // When scope changes, reload admins from backend using scope filters
            this.loadItems({
                page: 1,
                itemsPerPage: this.itemsPerPage,
                sortBy: this.tableOptions.sortBy || [],
            })
        },
    },
    mounted() {
        // Enforce branch scope for branch admins
        if (this.isBranchAdmin && this.sessionBranchId != null) {
            this.filters.branch = [this.sessionBranchId]
        }
        this.loadBranches()
        this.loadItems({
            page: 1,
            itemsPerPage: this.itemsPerPage,
            sortBy: [],
        })
        window.addEventListener('admin:updated', () => this.loadItems(this.tableOptions))
    },
    beforeUnmount() {
        window.removeEventListener('admin:updated', () => this.loadItems(this.tableOptions))
    },
    methods: {
        enforceBranchScope() {
            if (this.isBranchAdmin && this.sessionBranchId != null) {
                this.filters.branch = [this.sessionBranchId]
            }
        },
        canEditAdminRow(admin) {
            if (!admin) return false
            if (this.role === 'super_admin') return true
            if (this.role !== 'branch_admin') return false
            // branch admin: only edit admins in own branch, and never super_admin
            if (admin.role === 'super_admin') return false
            return this.sessionBranchId != null && Number(admin.branch_id) === Number(this.sessionBranchId)
        },
        canViewAdminRow(admin) {
            // Keep view aligned with edit scoping for branch admins.
            if (this.role === 'super_admin') return true
            if (this.role !== 'branch_admin') return false
            if (!admin) return false
            if (admin.role === 'super_admin') return false
            return this.sessionBranchId != null && Number(admin.branch_id) === Number(this.sessionBranchId)
        },
        async onApplyFilters(newFilters) {
            // Update local filters state (FilterDrawer already emitted update:modelValue)
            this.filters = { ...newFilters }

            this.enforceBranchScope()

            // Switch to All scope and fetch backend-driven filtered results
            this.suppressScopeWatcher = true
            this.scope = 'all'
            this.tableOptions.page = 1
            await this.fetchFilteredAdminsFromServer()
        },
        async loadItems({ page, itemsPerPage, sortBy }) {
            this.loading = true
            this.tableOptions = {
                page: page || 1,
                itemsPerPage: itemsPerPage || this.itemsPerPage,
                sortBy: sortBy || [],
            }

            this.enforceBranchScope()

            try {
                const scopeFilters = this.getScopeFilters()
                const enforced = (this.isBranchAdmin && this.sessionBranchId != null)
                    ? { branch: this.sessionBranchId }
                    : {}

                const { items, total } = await fetchAdminsPage({
                    ...scopeFilters,
                    ...enforced,
                    page: this.tableOptions.page,
                    itemsPerPage: this.tableOptions.itemsPerPage,
                })

                // Ensure result is an array and map branch name from related branch
                this.admins = (Array.isArray(items) ? items : []).map(admin => ({
                    ...admin,
                    branch_name: admin.branch?.name || (admin.branch_id ? `Branch ${admin.branch_id}` : ''),
                }))

                this.totalAdmins = typeof total === 'number' ? total : this.admins.length

                if (this.skipApplyAfterLoad) {
                    this.filteredAdmins = this.admins.slice()
                    this.skipApplyAfterLoad = false
                } else {
                    this.applyFilters()
                }
                console.log('Loaded admins count:', this.admins.length)
                console.log('First admin:', this.admins[0])
                console.log('Admins data:', this.admins)
            } catch (error) {
                console.error('Failed to load admins:', error)
                this.admins = []
                this.filteredAdmins = []
                this.dialog = {
                    visible: true,
                    title: 'Load Failed',
                    message: 'Failed to load admins: ' + (error.message || 'Unknown error'),
                    isError: true,
                }
            } finally {
                this.loading = false
            }
        },
        async loadBranches() {
            try {
                this.branches = await listActiveBranches()
            } catch (error) {
                console.error('Failed to load branches:', error)
                this.branches = []
            }
        },
        /**
         * Map current scope to backend filters for admins.
         */
        getScopeFilters() {
            if (this.scope === 'all') {
                    // Request all statuses from backend (explicitly set status to null)
                    // Backend interprets status=null as "all" and will paginate results.
                    return { status: null }
                }
                if (this.scope === 'active') {
                    // Backend: use is_active flag; don't filter by status
                    return { is_active: true }
                }
                if (this.scope === 'inactive') {
                    return { is_active: false }
                }
                // Archived scope: no dedicated query param; fetch all and
                // filter by is_archived flag on the frontend.
                return {}
        },
        /**
         * Fetch admins from backend using current filters (backend-driven)
         * Used when scope === 'all' and any filter is active.
         */
        async fetchFilteredAdminsFromServer() {
            this.loading = true
            try {
                this.enforceBranchScope()
                // Merge current scope filters with UI filters when querying backend
                const scopeFilters = this.getScopeFilters() || {}

                const mapped = {
                    // UI status filter overrides scope if present
                    status: (this.filters.status && this.filters.status.length > 0) ? this.filters.status[0] : undefined,
                    // branch: send scalar when single selection, array otherwise
                    branch: this.filters.branch && this.filters.branch.length > 0 ? (this.filters.branch.length === 1 ? this.filters.branch[0] : this.filters.branch) : undefined,
                    search: this.filters.search || undefined,
                    date_added_from: this.filters.dateAddedFrom || undefined,
                    date_added_to: this.filters.dateAddedTo || undefined,
                    // pagination
                    page: this.tableOptions.page,
                    itemsPerPage: this.tableOptions.itemsPerPage,
                }

                const params = { ...scopeFilters, ...mapped }

                const { items, total } = await fetchAdminsPage(params)

                this.admins = (Array.isArray(items) ? items : []).map(admin => ({
                    ...admin,
                    branch_name: admin.branch?.name || (admin.branch_id ? `Branch ${admin.branch_id}` : ''),
                }))

                this.totalAdmins = typeof total === 'number' ? total : this.admins.length
                this.filteredAdmins = this.admins.slice()
            } catch (error) {
                console.error('Failed to fetch filtered admins from server:', error)
                this.dialog = { visible: true, title: 'Load Failed', message: 'Failed to load admins: ' + (error.message || 'Unknown error'), isError: true }
                this.admins = []
                this.filteredAdmins = []
            } finally {
                this.loading = false
            }
        },
        async applyFilters() {
            this.enforceBranchScope()
            // If the appbar search was cleared, refetch from server for the current scope
            if (!this.filters.search) {
                this.tableOptions.page = 1
                this.skipApplyAfterLoad = true
                await this.loadItems({ page: this.tableOptions.page, itemsPerPage: this.tableOptions.itemsPerPage, sortBy: this.tableOptions.sortBy || [] })
                return
            }

            // If a search query exists, always run server-driven search
            if (this.filters.search && this.filters.search.length > 0) {
                // keep current scope in the request so backend can apply scope filters
                await this.fetchFilteredAdminsFromServer()
                return
            }

            // If scope is 'all' and other filters are active (status/branch/date), use server
            const otherFiltersActive = (
                (this.filters.status && this.filters.status.length > 0) ||
                (this.filters.branch && this.filters.branch.length > 0) ||
                this.filters.dateAddedFrom ||
                this.filters.dateAddedTo
            )

            if (this.scope === 'all' && otherFiltersActive) {
                await this.fetchFilteredAdminsFromServer()
                return
            }

            // Client-side fallback filtering for scopes without server query
            let filtered = this.admins.slice()

            // Hard-guard by archive flag so Archived tab never shows non-archived admins
            if (this.scope === 'archived') {
                filtered = filtered.filter(admin => admin.is_archived === true || admin.is_archived === 1)
            } else {
                // Active / Inactive tabs should only show non-archived admins
                filtered = filtered.filter(admin => !(admin.is_archived === true || admin.is_archived === 1))
            }

            // Search by Name, ID, Username (client-side fallback)
            if (this.filters.search) {
                const q = this.filters.search.toLowerCase()
                filtered = filtered.filter(admin =>
                    (admin.employee_id && admin.employee_id.toString().toLowerCase().includes(q)) ||
                    (admin.username && admin.username.toLowerCase().includes(q)) ||
                    (admin.first_name && admin.first_name.toLowerCase().includes(q)) ||
                    (admin.last_name && admin.last_name.toLowerCase().includes(q))
                )
            }

            // Filter by Role
            if (this.filters.status && this.filters.status.length > 0) {
                filtered = filtered.filter(admin => this.filters.status.includes(admin.role))
            }

            // Filter by Branch
            filtered = filterByBranchIds(filtered, this.filters.branch, (admin) => admin.branch_id)

            // Filter by Date Added Range
            if (this.filters.dateAddedFrom) {
                filtered = filtered.filter(admin => admin.created_at && admin.created_at.substring(0, 10) >= this.filters.dateAddedFrom)
            }

            if (this.filters.dateAddedTo) {
                filtered = filtered.filter(admin => admin.created_at && admin.created_at.substring(0, 10) <= this.filters.dateAddedTo)
            }

            this.filteredAdmins = filtered
        },
        onDownloadCsv() {
            exportAsCsv(this.filteredAdmins, this.adminHeaders, 'admins.csv');
        },
        onDownloadJson() {
            exportAsJson(this.filteredAdmins, 'admins.json');
        },
        onSearch() {
            const q = this.search && this.search.toLowerCase();
            if (!q) {
                this.filteredAdmins = this.admins.slice();
                return;
            }
            this.filteredAdmins = this.admins.filter(admin =>
                Object.values(admin).join(' ').toLowerCase().includes(q)
            );
        },
        async viewAdmin(admin) {
            if (!admin || !admin.id) {
                console.warn('viewAdmin called without valid admin:', admin);
                return;
            }
            if (!this.canViewAdminRow(admin)) {
                this.dialog = {
                    visible: true,
                    title: 'Permission Denied',
                    message: 'You can only view admins under your own branch.',
                    isError: true,
                }
                return
            }
            try {
                // Navigate to the view-admin details page
                this.$router.push({ name: 'view-admin', params: { id: admin.id } })
            } catch (error) {
                console.error('Failed to navigate to admin details:', error)
                    this.dialog = {
                        visible: true,
                        title: 'Navigation Failed',
                        message: 'Failed to navigate: ' + (error.message || 'Unknown error'),
                        isError: true,
                    }
            }
        },
        async editAdmin(admin) {
            if (!admin || !admin.id) {
                console.warn('editAdmin called without valid admin:', admin);
                return;
            }
            if (!this.canEditAdminRow(admin)) {
                this.dialog = {
                    visible: true,
                    title: 'Permission Denied',
                    message: 'You can only edit admins under your own branch.',
                    isError: true,
                }
                return
            }

            this.$router.push({ name: 'edit-admin', params: { id: admin.id } })
        },
        async archiveAdmin(admin) {
            if (!admin || !admin.id) {
                console.warn('archiveAdmin called without valid admin:', admin)
                return
            }

            if (!canCheck(ACTIONS.ARCHIVE)) {
                this.dialog = {
                    visible: true,
                    title: 'Permission Denied',
                    message: 'You do not have permission to archive admins.',
                    isError: true,
                }
                return
            }

            const label = admin.username || admin.employee_id || admin.email || admin.id
            const confirmed = window.confirm(`Archive admin "${label}"?`)
            if (!confirmed) return

            try {
                await updateAdmin(admin.id, { is_archived: true, is_active: false })

                this.dialog = {
                    visible: true,
                    title: 'Admin Archived',
                    message: 'The admin has been archived successfully.',
                    isError: false,
                }

                await this.loadItems(this.tableOptions)
                window.dispatchEvent(new CustomEvent('admin:updated', {
                    detail: { id: admin.id, action: 'archive' },
                }))
            } catch (error) {
                console.error('Failed to archive admin:', error)
                this.dialog = {
                    visible: true,
                    title: 'Archive Failed',
                    message: error.message || 'Failed to archive admin.',
                    isError: true,
                }
            }
        },
        prettyRole(role) {
            return (role || '').toString().replace(/_/g, ' ')
        },
        addAdmin() {
            if (!canCheck(ACTIONS.CREATE)) {
                    this.dialog = {
                        visible: true,
                        title: 'Permission Denied',
                        message: 'You do not have permission to create admins.',
                        isError: true,
                    }
                return;
            }
            this.$router.push({ name: 'create-admin' });
        },
    },
}
</script>