<template>
    <AppBar title="Procurement Management">
        <template #search-actions>
            <div>
                <v-text-field density="compact" v-model="filters.search" label="Search Request ID" variant="solo-filled"
                    hide-details="auto" @input="applyFilters" style="max-width:360px;" />
            </div>
        </template>

        <template #button-actions v-if="canCreate">
            <v-btn prepend-icon="fa-plus" variant="tonal" @click="createNew">Create Request</v-btn>
        </template>
    </AppBar>

    <v-container fluid>
        <v-row>
            <v-col cols="12" class="mt-8">
                <ScopeTab
                    v-model="scope"
                    :scopes="procurementScopes"
                />
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12">
                <Table
                    :headers="procurementHeaders"
                    :items="filteredProcurements"
                    :items-length="totalProcurements"
                    :loading="loading"
                    v-model:items-per-page="itemsPerPage"
                    item-key="id"
                    @update:options="loadItems"
                >
                    <template #actions="{ item }">
                        <v-btn icon="fa-eye" size="x-small" variant="plain" @click.stop="viewProcurement(item)" title="View"></v-btn>
                        <v-btn icon="fa-pencil" size="x-small" variant="plain" @click.stop="editProcurement(item)" title="Edit" v-if="scope === 'active'"></v-btn>
                        <v-btn v-if="scope === 'active'" icon="fa-box-archive" size="x-small" variant="plain" @click.stop="archiveProcurement(item)" title="Archive"></v-btn>
                        <v-btn v-if="scope === 'archived'" icon="fa-rotate-left" size="x-small" variant="plain" @click.stop="restoreProcurement(item)" title="Restore"></v-btn>
                    </template>

                    <!-- Custom status column rendering -->
                    <template #cell-admin_approval="{ item }">
                        <v-chip 
                            :color="getApprovalColor(item.admin_approval)" 
                            size="small"
                            variant="elevated">
                            {{ formatApprovalStatus(item.admin_approval) }}
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
        :filters="['search', 'status', 'branch', 'dateAddedRange']"
        :statusOptions="approvalStatusOptions"
        :branchOptions="branches"
        searchLabel="Request ID or Requester"
        @update:modelValue="applyFilters"
    />
</template>

<script>
import AppBar from '@/components/AppBar.vue'
import Table from '@/components/Table.vue'
import ScopeTab from '@/components/ScopeTab.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import FilterDrawer from '@/components/FilterDrawer.vue'
import { fetchProcurementsPage, archiveProcurement, restoreProcurement } from '@/services/procurement'
import { listActiveBranches } from '@/services/branch'
import { subscribeToActions, waitForEchoConnection } from '@/services/realtime'
import { exportAsCsv, exportAsJson } from '@/services/export'
import { ACTIONS, can as canCheck } from '@/services/permission'
import { filterByBranchIds } from '@/utils/filtering'

export default {
    name: 'procurement',
    components: { AppBar, Table, ScopeTab, ErrorDialog, FilterDrawer },
    data() {
        return {
            loading: false,
            scope: 'active',
            scopeCounts: {
                active: null,
                archived: null,
            },
            procurements: [],
            filteredProcurements: [],
            totalProcurements: 0,
            itemsPerPage: 10,
            tableOptions: {
                page: 1,
                itemsPerPage: 10,
                sortBy: [],
            },
            branches: [],
            canCreate: canCheck(ACTIONS.CREATE),
            pollingInterval: null,
            loadProcurementsTimeout: null,
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
            approvalStatusOptions: [
                { value: 'pending', title: 'Pending' },
                { value: 'approved', title: 'Approved' },
                { value: 'rejected', title: 'Rejected' },
            ],
            procurementScopes: [
                { value: 'approved', label: 'Approved' },
                { value: 'pending', label: 'Pending' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'archived', label: 'Archived' },
            ],
            procurementHeaders: [
                { text: 'ID', value: 'id' },
                { text: 'Title', value: 'title' },
                { text: 'Author', value: 'author' },
                { text: 'Quantity', value: 'quantity_requested' },
                { text: 'Year', value: 'year_of_publication' },
                { text: 'Approval Status', value: 'admin_approval' },
                { text: 'Actions', value: 'actions', sortable: false },
            ],
        }
    },
    watch: {
        scope() {
            // When scope changes, reload procurements from backend using scope filters
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
        
        // Create event handler and store reference for cleanup
        this.handleRealtimeUpdate = (event) => {
            if (event.detail.action === 'create' || event.detail.action === 'update' || 
                event.detail.action === 'archive' || event.detail.action === 'restore') {
                
                // Debounce reload to prevent multiple simultaneous API calls
                if (this.loadProcurementsTimeout) {
                    clearTimeout(this.loadProcurementsTimeout)
                }
                
                this.isRealtimeUpdate = true
                this.loadProcurementsTimeout = setTimeout(async () => {
                    await this.loadItems(this.tableOptions)
                    this.isRealtimeUpdate = false
                }, 500)
            }
        }
        
        // Listen for real-time procurement updates
        window.addEventListener('action:procurement', this.handleRealtimeUpdate)
    },
    beforeUnmount() {
        // Cleanup event listener
        if (this.handleRealtimeUpdate) {
            window.removeEventListener('action:procurement', this.handleRealtimeUpdate)
        }
        
        // Cleanup timers
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval)
        }
        if (this.loadProcurementsTimeout) {
            clearTimeout(this.loadProcurementsTimeout)
        }
    },
    methods: {
        async loadItems({ page, itemsPerPage, sortBy }) {
            // Only show loading spinner on initial load, not on real-time updates
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
                const { items, total } = await fetchProcurementsPage({
                    ...scopeFilters,
                    page: this.tableOptions.page,
                    itemsPerPage: this.tableOptions.itemsPerPage,
                })

                this.procurements = Array.isArray(items) ? items : []
                this.totalProcurements = typeof total === 'number' ? total : this.procurements.length

                this.applyFilters()
            } catch (error) {
                console.error(`Failed to load ${this.scope} procurements:`, error)
                this.procurements = []
                this.filteredProcurements = []
                this.dialog = {
                    visible: true,
                    title: 'Load Failed',
                    message: 'Failed to load procurements: ' + (error.message || 'Unknown error'),
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
         * Map current scope to backend ListQueryService filters.
         * Scope is enforced by backend; other filters remain frontend-only.
         */
        getScopeFilters() {
            if (this.scope === 'approved') {
                return { status: 'approved', archived: 'false', active: true }
            }
            if (this.scope === 'pending') {
                return { status: 'pending', archived: 'false', active: true }
            }
            if (this.scope === 'rejected') {
                return { status: 'rejected', archived: 'false', active: true }
            }
            if (this.scope === 'archived') {
                return { archived: 'true' }
            }
            return {}
        },
        applyFilters() {
            let filtered = this.procurements.slice()

            // Search by ID or Requester
            if (this.filters.search) {
                const q = this.filters.search.toLowerCase()
                filtered = filtered.filter(proc =>
                    (proc.id && proc.id.toString().toLowerCase().includes(q)) ||
                    (proc.requester && proc.requester.toLowerCase().includes(q))
                )
            }

            // Filter by Approval Status
            if (this.filters.status && this.filters.status.length > 0) {
                filtered = filtered.filter(proc =>
                    this.filters.status.includes(proc.admin_approval)
                )
            }

            // Filter by Branch
            filtered = filterByBranchIds(filtered, this.filters.branch, (proc) => proc.branch_id)

            // Filter by Date Added Range
            if (this.filters.dateAddedFrom) {
                filtered = filtered.filter(proc =>
                    proc.created_at && proc.created_at.substring(0, 10) >= this.filters.dateAddedFrom
                )
            }

            if (this.filters.dateAddedTo) {
                filtered = filtered.filter(proc =>
                    proc.created_at && proc.created_at.substring(0, 10) <= this.filters.dateAddedTo
                )
            }

            this.filteredProcurements = filtered
        },
        applySearch() {
            const q = this.search && this.search.toLowerCase()
            if (!q) {
                this.filteredProcurements = this.procurements.slice()
                return
            }
            this.filteredProcurements = this.procurements.filter(proc =>
                Object.values(proc).join(' ').toLowerCase().includes(q)
            )
        },
        onSearch() {
            this.applySearch()
        },
        viewProcurement(procurement) {
            if (!procurement || !procurement.id) {
                console.warn('viewProcurement called without valid procurement:', procurement)
                return
            }
            try {
                this.$router.push({ name: 'view-procurement', params: { id: procurement.id } })
            } catch (error) {
                console.error('Failed to navigate:', error)
            }
        },
        editProcurement(procurement) {
            if (!procurement || !procurement.id) {
                console.warn('editProcurement called without valid procurement:', procurement)
                return
            }
            try {
                this.$router.push({ name: 'edit-procurement', params: { id: procurement.id } })
            } catch (error) {
                console.error('Failed to navigate:', error)
            }
        },
        async archiveProcurement(procurement) {
            if (!procurement || !procurement.id) return

            const confirmed = window.confirm(`Archive procurement "${procurement.title}"?`)
            if (!confirmed) return

            try {
                await archiveProcurement(procurement.id)
                this.loadProcurements()
            } catch (error) {
                console.error('Failed to archive:', error)
                this.showDialog('Error', error.message, true)
            }
        },
        async restoreProcurement(procurement) {
            if (!procurement || !procurement.id) return

            const confirmed = window.confirm(`Restore procurement "${procurement.title}"?`)
            if (!confirmed) return

            try {
                await restoreProcurement(procurement.id)
                this.loadProcurements()
            } catch (error) {
                console.error('Failed to restore:', error)
                this.showDialog('Error', error.message, true)
            }
        },
        createNew() {
            if (!canCheck(ACTIONS.CREATE)) {
                this.dialog = {
                    visible: true,
                    title: 'Permission Denied',
                    message: 'You do not have permission to create procurements.',
                    isError: true,
                }
                return
            }
            this.$router.push({ name: 'create-procurement' })
        },
        onDownloadCsv() {
            exportAsCsv(this.filteredProcurements, this.procurementHeaders, 'procurements.csv')
        },
        onDownloadJson() {
            exportAsJson(this.filteredProcurements, 'procurements.json')
        },
        formatApprovalStatus(status) {
            const statusMap = {
                'pending': 'Pending',
                'approved': 'Approved',
                'rejected': 'Rejected',
            }
            return statusMap[status] || status
        },
        getApprovalColor(status) {
            const colorMap = {
                'pending': 'warning',
                'approved': 'success',
                'rejected': 'error',
            }
            return colorMap[status] || 'default'
        },
    },
}
</script>
