<template>
    <AppBar title="Procurement Management">
        <template #search-actions>
            <div>
                <v-text-field density="compact" v-model="filters.search" label="Search Request ID" variant="solo-filled"
                    hide-details="auto" @input="applyFilters" style="max-width:360px;" prepend-inner-icon="fas fa-magnifying-glass"/>
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
                        <v-btn type="button" icon="fa-pencil" size="x-small" variant="plain" @click.stop="editProcurement(item)" title="Edit" v-if="scope !== 'archived' && item.admin_approval !== 'approved'"></v-btn>
                        <v-btn
                            type="button"
                            v-if="scope !== 'archived' && item.admin_approval !== 'approved'"
                            icon="fa-box-archive"
                            size="x-small"
                            variant="plain"
                            @click.stop="archiveProcurement(item)"
                            title="Archive"
                        ></v-btn>
                        <v-btn type="button" v-if="scope === 'archived'" icon="fa-rotate-left" size="x-small" variant="plain" @click.stop="restoreProcurement(item)" title="Restore"></v-btn>
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
        <!-- Error Dialog -->
        <ErrorDialog 
            :visible.sync="dialog.visible" 
            :title="dialog.title" 
            :message="dialog.message" 
            :isError="dialog.isError"
            @update:visible="dialog.visible = $event"
        />

        <!-- Confirm Archive/Restore Dialog -->
        <v-dialog v-model="confirmDialog.visible" max-width="480px">
            <v-card>
                <v-card-title class="text-h6">{{ confirmDialog.title }}</v-card-title>
                <v-card-text>
                    <div>{{ confirmDialog.message }}</div>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="confirmDialog.visible = false">Cancel</v-btn>
                    <v-btn :color="confirmDialog.action === 'archive' ? 'error' : 'primary'" @click="confirmDialogConfirmed" :loading="loading">
                        {{ confirmDialog.action === 'archive' ? 'Archive' : 'Restore' }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </template>

<script>
import AppBar from '@/components/AppBar.vue'
import Table from '@/components/Table.vue'
import ScopeTab from '@/components/ScopeTab.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import FilterDrawer from '@/components/FilterDrawer.vue'
import { fetchProcurementsPage, archiveProcurement as archiveProcurementService, restoreProcurement as restoreProcurementService } from '@/services/procurement'
import { listActiveBranches } from '@/services/branch'
import { subscribeToActions, waitForEchoConnection } from '@/services/realtime'
import { exportAsCsv, exportAsJson } from '@/services/export'
import { getSession } from '@/services/permission'
import { filterByBranchIds } from '@/utils/filtering'

const canCreateProcurement = () => {
    const session = getSession()
    if (!session) return false

    // Block only assistant-type admins; allow all other roles
    if (session.role === 'admin' && session.employee_type === 'assistant') {
        return false
    }

    return true
}

export default {
    name: 'procurement',
    components: { AppBar, Table, ScopeTab, ErrorDialog, FilterDrawer },
    data() {
        return {
            loading: false,
            scope: 'approved',
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
            canCreate: canCreateProcurement(),
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
                { value: 'all', label: 'All' },
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
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: false,
            },
            confirmDialog: {
                visible: false,
                title: '',
                message: '',
                payload: null,
                action: null,
            },
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
            if (this.scope === 'all') {
                return { status: null, archived: 'false', active: true }
            }
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
                console.log('Navigating to edit-procurement', procurement.id)
                this.$router.push({ name: 'edit-procurement', params: { id: procurement.id } })
            } catch (error) {
                console.error('Failed to navigate to edit-procurement:', error)
            }
        },
        async archiveProcurement(procurement) {
            if (!procurement || !procurement.id) return

            // Prevent archiving approved procurements
            if (procurement.admin_approval === 'approved') {
                this.showDialog('Action Not Allowed', 'Approved procurements cannot be archived.', true)
                return
            }

            // open confirmation dialog instead of native confirm
            this.confirmDialog = {
                visible: true,
                title: 'Confirm Archive',
                message: `Archive procurement "${procurement.title}"?`,
                payload: procurement,
                action: 'archive',
            }
        },
        async restoreProcurement(procurement) {
            if (!procurement || !procurement.id) return

            // open confirmation dialog instead of native confirm
            this.confirmDialog = {
                visible: true,
                title: 'Confirm Restore',
                message: `Restore procurement "${procurement.title}"?`,
                payload: procurement,
                action: 'restore',
            }
        },
        createNew() {
            if (!canCreateProcurement()) {
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
        async confirmDialogConfirmed() {
            if (!this.confirmDialog || !this.confirmDialog.payload) return
            const { action, payload } = this.confirmDialog
            this.confirmDialog.visible = false

            try {
                if (action === 'archive') {
                    await archiveProcurementService(payload.id)
                } else if (action === 'restore') {
                    await restoreProcurementService(payload.id)
                }
                await this.loadItems(this.tableOptions)
            } catch (error) {
                console.error(`Failed to ${action}:`, error)
                this.showDialog('Error', error.message || 'Unknown error', true)
            }
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
