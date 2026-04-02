<template>
    <AppBar title="Acquisition Management">
        <template #search-actions>
            <div>
                <v-text-field density="compact" v-model="filters.search" label="Search Function ID" variant="solo-filled"
                    hide-details="auto" @input="applyFilters" style="max-width:360px;" prepend-inner-icon="fas fa-magnifying-glass" />
            </div>
        </template>

        <template #button-actions v-if="canCreate">
            <v-btn prepend-icon="fa-plus" variant="tonal" @click="createNew">Create Acquisition</v-btn>
        </template>
    </AppBar>

    <v-container fluid>
        <v-row>
            <v-col cols="12" class="mt-8">
                <ScopeTab
                    v-model="scope"
                    :scopes="acquisitionScopes"
                />
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12">
                <Table
                    :headers="acquisitionHeaders"
                    :items="filteredAcquisitions"
                    :items-length="totalAcquisitions"
                    :loading="loading"
                    v-model:items-per-page="itemsPerPage"
                    item-key="id"
                    @update:options="loadItems"
                >
                    <template #actions="{ item }">
                        <v-btn icon="fa-eye" size="x-small" variant="plain" @click.stop="viewAcquisition(item)"></v-btn>
                        <v-btn
                            v-if="canShowEditButton"
                            icon="fa-pencil"
                            size="x-small"
                            variant="plain"
                            @click.stop="editAcquisition(item)"
                        ></v-btn>
                        <!-- Show archive in all non-archived scopes except 'received' -->
                        <v-btn
                            v-if="canArchive && scope !== 'archived' && scope !== 'received'"
                            icon="fa-box-archive"
                            size="x-small"
                            variant="plain"
                            @click.stop="archiveAcquisition(item)"
                        ></v-btn>
                        <v-btn
                            v-if="canArchive && scope === 'archived'"
                            icon="fa-rotate-left"
                            size="x-small"
                            variant="plain"
                            @click.stop="restoreAcquisition(item)"
                        ></v-btn>
                    </template>

                    <!-- Custom status column rendering -->
                    <template #cell-acquisition_status="{ item }">
                        <v-chip 
                            :color="getStatusColor(item.acquisition_status)" 
                            size="small"
                            variant="elevated">
                            {{ formatStatus(item.acquisition_status) }}
                        </v-chip>
                    </template>

                    <!-- Custom method column rendering -->
                    <template #cell-acquisition_method="{ item }">
                        <v-chip size="small">{{ formatMethod(item.acquisition_method) }}</v-chip>
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

    <!-- Error Dialog -->
    <ErrorDialog 
        :visible.sync="dialog.visible" 
        :title="dialog.title" 
        :message="dialog.message" 
        :isError="dialog.isError"
        @update:visible="dialog.visible = $event"
    />

    <!-- Filter Drawer -->
    <FilterDrawer
        v-model="filters"
        :filters="['search', 'status', 'method', 'branch', 'dateAcquired', 'dateAddedRange']"
        :statusOptions="acquisitionStatusOptions"
        :methodOptions="acquisitionMethodOptions"
        :branchOptions="branches"
        searchLabel="Function ID"
        @update:modelValue="applyFilters"
    />
</template>

<script>
import AppBar from '@/components/AppBar.vue'
import Table from '@/components/Table.vue'
import ScopeTab from '@/components/ScopeTab.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import FilterDrawer from '@/components/FilterDrawer.vue'
import { fetchAcquisitionsPage, archiveAcquisition, restoreAcquisition } from '@/services/acquisition'
import { listActiveBranches } from '@/services/branch'
import { subscribeToActions, waitForEchoConnection } from '@/services/realtime'
import { exportAsCsv, exportAsJson } from '@/services/export'
import { ACTIONS, can as canCheck } from '@/services/permission'
import { getSession } from '@/services/auth'
import { filterByBranchIds } from '@/utils/filtering'

export default {
    name: 'acquisition',
    components: { AppBar, Table, ScopeTab, ErrorDialog, FilterDrawer },
    data() {
        return {
            loading: false,
            scope: 'active',
            scopeCounts: {
                active: null,
                archived: null,
            },
            acquisitions: [],
            filteredAcquisitions: [],
            totalAcquisitions: 0,
            itemsPerPage: 10,
            tableOptions: {
                page: 1,
                itemsPerPage: 10,
                sortBy: [],
            },
            branches: [],
            canCreate: canCheck(ACTIONS.CREATE),
            canEdit: canCheck(ACTIONS.EDIT),
            canArchive: canCheck(ACTIONS.ARCHIVE),
            pollingInterval: null,
            loadAcquisitionsTimeout: null,
            isRealtimeUpdate: false,
            handleRealtimeUpdate: null,
            filters: {
                search: '',
                status: [],
                method: [],
                branch: [],
                dateAcquired: '',
                dateAddedFrom: '',
                dateAddedTo: '',
            },
            acquisitionStatusOptions: [
                { value: 'pending', title: 'Pending' },
                { value: 'received', title: 'Received' },
                { value: 'partial', title: 'Partial' },
                { value: 'missing', title: 'Missing' },
                { value: 'cancelled', title: 'Cancelled' },
            ],
            acquisitionScopes: [
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'received', label: 'Received' },
                { value: 'missing', label: 'Missing' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'archived', label: 'Archived' },
            ],
            acquisitionMethodOptions: [
                { value: 'book_fair', title: 'Book Fair' },
                { value: 'supplier', title: 'Supplier' },
                { value: 'donation', title: 'Donation' },
            ],
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: false,
            },
            acquisitionHeaders: [
                { text: 'ID', value: 'id' },
                { text: 'Title', value: 'title' },
                { text: 'Author', value: 'author' },
                { text: 'Method', value: 'acquisition_method' },
                { text: 'Qty Requested', value: 'quantity_requested' },
                { text: 'Status', value: 'acquisition_status' },
                { text: 'Actions', value: 'actions', sortable: false },
            ],
        }
    },
    computed: {
        canShowEditButton() {
            try {
                const session = getSession()
                const role = session && session.role ? session.role.toString().toLowerCase() : ''
                // hide edit for admin and branch_admin roles
                if (role === 'admin' || role === 'branch_admin') return false
            } catch (e) {
                // if session read fails, fallback to permission check only
            }
            return this.canEdit
        },
    },
    watch: {
        scope() {
            // When scope changes, reload acquisitions from backend using scope filters
            this.loadItems({
                page: 1,
                itemsPerPage: this.itemsPerPage,
                sortBy: this.tableOptions.sortBy || [],
            })
        }
    },
    mounted() {
        this.loadBranches()
        this.loadItems({
            page: 1,
            itemsPerPage: this.itemsPerPage,
            sortBy: [],
        })
        
        this.handleRealtimeUpdate = (event) => {
            if (event.detail.action === 'create' || event.detail.action === 'update' || 
                event.detail.action === 'archive' || event.detail.action === 'restore') {
                
                if (this.loadAcquisitionsTimeout) {
                    clearTimeout(this.loadAcquisitionsTimeout)
                }
                
                this.isRealtimeUpdate = true
                this.loadAcquisitionsTimeout = setTimeout(async () => {
                    await this.loadItems(this.tableOptions)
                    this.isRealtimeUpdate = false
                }, 500)
            }
        }
        
        window.addEventListener('action:acquisition', this.handleRealtimeUpdate)
    },
    beforeUnmount() {
        if (this.handleRealtimeUpdate) {
            window.removeEventListener('action:acquisition', this.handleRealtimeUpdate)
        }
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval)
        }
        if (this.loadAcquisitionsTimeout) {
            clearTimeout(this.loadAcquisitionsTimeout)
        }
    },
    methods: {
        async loadBranches() {
            try {
                this.branches = await listActiveBranches()
            } catch (error) {
                console.error('Failed to load branches:', error)
                this.branches = []
            }
        },
        async loadItems({ page, itemsPerPage, sortBy }) {
            if (!this.isRealtimeUpdate) {
                this.loading = true
            }

            this.tableOptions = {
                page: page || 1,
                itemsPerPage: itemsPerPage || this.itemsPerPage,
                sortBy: sortBy || [],
            }

            try {
                const scopeFilters = this.getScopeFilters()
                console.log('[Acquisition] loadItems tableOptions:', this.tableOptions)
                console.log('[Acquisition] loadItems scopeFilters:', scopeFilters)
                const { items, total } = await fetchAcquisitionsPage({
                    ...scopeFilters,
                    page: this.tableOptions.page,
                    itemsPerPage: this.tableOptions.itemsPerPage,
                })

                this.acquisitions = Array.isArray(items) ? items : []

                // Defensive filter: ensure scope-specific status is enforced client-side
                const scopeStatusMap = {
                    pending: 'pending',
                    received: 'received',
                    missing: 'missing',
                    cancelled: 'cancelled',
                }
                const expectedStatus = scopeStatusMap[this.scope]
                if (expectedStatus) {
                    this.acquisitions = this.acquisitions.filter(
                        acq => acq.acquisition_status === expectedStatus
                    )
                }

                this.totalAcquisitions = typeof total === 'number' ? total : this.acquisitions.length

                console.log('[Acquisition] loadItems acquisitions length:', this.acquisitions.length, 'total:', this.totalAcquisitions)

                this.applyFilters()
            } catch (error) {
                console.error(`Failed to load ${this.scope} acquisitions:`, error)
                this.acquisitions = []
                this.filteredAcquisitions = []
                this.dialog = {
                    visible: true,
                    title: 'Load Failed',
                    message: 'Failed to load acquisitions: ' + (error.message || 'Unknown error'),
                    isError: true,
                }
            } finally {
                this.loading = false
            }
        },
        /**
         * Map current scope to backend filters for acquisitions.
         */
        getScopeFilters() {
            console.log('[Acquisition] getScopeFilters scope:', this.scope)
            if (this.scope === 'all') {
                return { status: null, archived: 'false' }
            }
            if (this.scope === 'pending') {
                return { status: 'pending', archived: 'false' }
            }
            if (this.scope === 'received') {
                return { status: 'received', archived: 'false' }
            }
            if (this.scope === 'missing') {
                return { status: 'missing', archived: 'false' }
            }
            if (this.scope === 'cancelled') {
                return { status: 'cancelled', archived: 'false' }
            }
            if (this.scope === 'archived') {
                return { archived: 'true' }
            }
            return {}
        },
        applyFilters() {
            console.log('[Acquisition] applyFilters input filters:', this.filters)
            let filtered = this.acquisitions.slice()

            // Filter by search (ID, Title, Author, Requester)
            if (this.filters.search) {
                const q = this.filters.search.toLowerCase()
                filtered = filtered.filter(acq =>
                    (acq.id && acq.id.toString().toLowerCase().includes(q)) ||
                    (acq.title && acq.title.toLowerCase().includes(q)) ||
                    (acq.author && acq.author.toLowerCase().includes(q)) ||
                    (acq.requester && acq.requester.toLowerCase().includes(q))
                )
            }

            // Filter by status
            if (this.filters.status && this.filters.status.length > 0) {
                filtered = filtered.filter(acq =>
                    this.filters.status.includes(acq.acquisition_status)
                )
            }

            // Filter by method
            if (this.filters.method && this.filters.method.length > 0) {
                filtered = filtered.filter(acq =>
                    this.filters.method.includes(acq.acquisition_method)
                )
            }

            // Filter by branch
            filtered = filterByBranchIds(filtered, this.filters.branch, (acq) => acq.branch_id)

            // Filter by date acquired
            if (this.filters.dateAcquired) {
                filtered = filtered.filter(acq =>
                    acq.date_acquired === this.filters.dateAcquired
                )
            }

            // Filter by date added range
            if (this.filters.dateAddedFrom) {
                filtered = filtered.filter(acq =>
                    acq.created_at && acq.created_at.substring(0, 10) >= this.filters.dateAddedFrom
                )
            }

            if (this.filters.dateAddedTo) {
                filtered = filtered.filter(acq =>
                    acq.created_at && acq.created_at.substring(0, 10) <= this.filters.dateAddedTo
                )
            }

            this.filteredAcquisitions = filtered
            console.log('[Acquisition] applyFilters result length:', this.filteredAcquisitions.length)
        },
        viewAcquisition(acquisition) {
            if (!acquisition || !acquisition.id) {
                console.warn('viewAcquisition called without valid acquisition:', acquisition)
                return
            }
            try {
                this.$router.push({ name: 'view-acquisition', params: { id: acquisition.id } })
            } catch (error) {
                console.error('Failed to navigate:', error)
            }
        },
        editAcquisition(acquisition) {
            if (!acquisition || !acquisition.id) {
                console.warn('editAcquisition called without valid acquisition:', acquisition)
                return
            }
            try {
                this.$router.push({ name: 'edit-acquisition', params: { id: acquisition.id } })
            } catch (error) {
                console.error('Failed to navigate:', error)
            }
        },
        async archiveAcquisition(acquisition) {
            if (!acquisition || !acquisition.id) return

            const confirmed = window.confirm(`Archive acquisition "${acquisition.title}"?`)
            if (!confirmed) return

            try {
                await archiveAcquisition(acquisition.id)
                await this.loadItems(this.tableOptions)
            } catch (error) {
                console.error('Failed to archive:', error)
                this.dialog = {
                    visible: true,
                    title: 'Archive Failed',
                    message: 'Error archiving acquisition: ' + (error.message || 'Unknown error'),
                    isError: true,
                }
            }
        },
        async restoreAcquisition(acquisition) {
            if (!acquisition || !acquisition.id) return

            const confirmed = window.confirm(`Restore acquisition "${acquisition.title}"?`)
            if (!confirmed) return

            try {
                await restoreAcquisition(acquisition.id)
                await this.loadItems(this.tableOptions)
            } catch (error) {
                console.error('Failed to restore:', error)
                this.dialog = {
                    visible: true,
                    title: 'Restore Failed',
                    message: 'Error restoring acquisition: ' + (error.message || 'Unknown error'),
                    isError: true,
                }
            }
        },
        createNew() {
            if (!canCheck(ACTIONS.CREATE)) {
                this.dialog = {
                    visible: true,
                    title: 'Permission Denied',
                    message: 'You do not have permission to create acquisitions.',
                    isError: true,
                }
                return
            }
            this.$router.push({ name: 'create-acquisition' })
        },
        onDownloadCsv() {
            exportAsCsv(this.filteredAcquisitions, this.acquisitionHeaders, 'acquisitions.csv')
        },
        onDownloadJson() {
            exportAsJson(this.filteredAcquisitions, 'acquisitions.json')
        },
        formatStatus(status) {
            return (status || '').toString().replace(/_/g, ' ').toUpperCase()
        },
        formatMethod(method) {
            const map = {
                'book_fair': 'Book Fair',
                'supplier': 'Supplier',
                'donation': 'Donation',
            }
            return map[method] || method
        },
        getStatusColor(status) {
            const colorMap = {
                'received': 'success',
                'partial': 'warning',
                'pending': 'info',
                'missing': 'error',
                'cancelled': 'secondary',
            }
            return colorMap[status] || 'default'
        },
        showDialog(title, message, isError = false) {
            this.dialog = { visible: true, title, message, isError }
        },
    },
}
</script>
