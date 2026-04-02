<template>
    <v-container>
        <v-row>
            <v-col class="mt-8">
                <AppBar title="Records">
                    <template #search-actions>
                        <v-text-field 
                            density="compact" 
                            v-model="filters.search" 
                            label="Search" 
                            variant="solo-filled"
                            hide-details="auto" 
                            @input="applyFilters" 
                            style="max-width:360px;" 
                            prepend-inner-icon="fas fa-magnifying-glass"
                        />
                    </template>
                </AppBar>

                <ScopeTab
                    v-model="scope"
                    :scopes="recordScopes"
                    class="mt-4 mb-2"
                />

                <!-- Filter Drawer Component -->
                <FilterDrawer
                    v-model="filters"
                    :filters="['search', 'status', 'branch', 'dateAddedRange']"
                    :statusOptions="recordStatusOptions"
                    :branchOptions="branches"
                    @apply="onApplyFilters"
                />

                <Table
                    :headers="displayHeaders"
                    :items="filteredRecords"
                    :items-length="totalRecords"
                    :loading="loading"
                    v-model:items-per-page="itemsPerPage"
                    item-key="id"
                    @update:options="loadItems"
                >
                    <template #actions="{ item }">
                        <v-btn icon="fa-eye" size="x-small" variant="plain" @click.stop="viewRecord(item)"></v-btn>
                        <v-btn icon="fa-pencil" size="x-small" variant="plain" @click.stop="openEditRecord(item)"></v-btn>
                        <v-btn
                            v-if="scope !== 'archived' && !item.is_archived"
                            icon="fa-box-archive"
                            size="x-small"
                            variant="plain"
                            @click.stop="archiveRecord(item)"
                            title="Archive"
                        ></v-btn>
                        <v-btn
                            v-if="scope === 'archived' || item.is_archived"
                            icon="fa-rotate-left"
                            size="x-small"
                            variant="plain"
                            @click.stop="restoreRecord(item)"
                            title="Restore"
                        ></v-btn>
                    </template>

                    <!-- Custom cell slot for status column -->
                    <template #cell-status="{ item }">
                        <v-chip variant="elevated" color="warning" size="small" v-if="item.status === 'borrowed'">
                            <p class="text-capitalize">{{ item.status }}</p>
                        </v-chip>
                        <v-chip variant="elevated" color="success" size="small" v-else-if="item.status === 'returned'">
                            <p class="text-capitalize">{{ item.status }}</p>
                        </v-chip>
                        <v-chip variant="elevated" color="error" size="small" v-else>
                            <p class="text-capitalize">{{ item.status }}</p>
                        </v-chip>
                    </template>
                    <!-- Penalized column for overdue/lost -->
                    <template #cell-is_penalized="{ item }">
                        <v-chip size="small" variant="tonal" :color="item.is_penalized ? 'error' : 'default'">
                            <p class="text-capitalize">{{ item.is_penalized ? 'Yes' : 'No' }}</p>
                        </v-chip>
                    </template>

                    <!-- Fine paid column for overdue/lost -->
                    <template #cell-is_fine_paid="{ item }">
                        <v-chip size="small" variant="tonal" :color="item.is_fine_paid ? 'success' : 'warning'">
                            <p class="text-capitalize">{{ item.is_fine_paid ? 'Paid' : 'Unpaid' }}</p>
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

    <!-- Error Dialog -->
    <ErrorDialog 
        :visible.sync="dialog.visible" 
        :title="dialog.title" 
        :message="dialog.message" 
        :isError="dialog.isError"
        @update:visible="dialog.visible = $event"
    />

    <!-- View Record Dialog using InfoTable -->
    <v-dialog v-model="viewDialogVisible" max-width="700px">
        <v-card>
            <v-card-title class="text-h6">{{ viewTitle || 'Record Details' }}</v-card-title>
            <v-card-text>
                <InfoTable :title="viewTitle" :fields="viewFields" />
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="viewDialogVisible = false">Close</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    

    <!-- Edit Borrow Record Dialog -->
    <v-dialog v-model="editDialogVisible" max-width="600px">
        <v-card>
            <v-card-title class="text-h6">Edit Borrow Record</v-card-title>
            <v-card-text>
                <v-row>
                    <v-col cols="12" md="6">
                        <v-text-field
                            label="Borrowed Book"
                            :model-value="selectedRecord?.borrowedBook || ''"
                            readonly
                        />
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-text-field
                            label="Borrower Name"
                            :model-value="selectedRecord?.borrowerName || ''"
                            disabled
                            style="background:#f5f5f5"
                        />
                    </v-col>
                </v-row>

                <v-row>
                    <v-col cols="12" md="6">
                        <v-select
                            v-model="editRecordForm.status"
                            :items="statusEditOptions"
                            item-title="label"
                            item-value="value"
                            label="Status"
                        />
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-text-field
                            v-model="editRecordForm.due_date"
                            type="date"
                            label="Due Date"
                            append-inner-icon="fa-calendar"
                        />
                    </v-col>
                </v-row>

                <v-row>
                    <v-col cols="12" md="6">
                        <v-switch
                            v-model="editRecordForm.is_overdue"
                            label="Overdue"
                        />
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-switch
                            v-model="editRecordForm.is_fine_paid"
                            label="Fine Paid"
                        />
                    </v-col>
                </v-row>

                <v-textarea
                    v-model="editRecordForm.remarks"
                    label="Remarks"
                    rows="3"
                    auto-grow
                />
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="closeEditDialog" :disabled="editRecordLoading">Cancel</v-btn>
                <v-btn color="primary" variant="flat" @click="saveEditRecord" :loading="editRecordLoading">
                    Save
                </v-btn>
                <v-btn
                    variant="outlined"
                    color="error"
                    class="ml-2"
                    @click="markLost"
                    :disabled="!selectedRecord || editRecordLoading"
                >
                    Mark Lost
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
import AppBar from '../components/AppBar.vue'
import Table from '../components/Table.vue'
import ErrorDialog from '../components/ErrorDialog.vue'
import FilterDrawer from '../components/FilterDrawer.vue'
import ScopeTab from '@/components/ScopeTab.vue'
import InfoTable from '@/components/InfoTable.vue'
// InfoTable import removed during revert
import { fetchBorrowsPage, updateBorrowRecord, archiveBorrowRecord, restoreBorrowRecord } from '../services/borrow.js'
import { listActiveBranchesCached } from '@/services/branch'
import { exportAsCsv, exportAsJson } from '@/services/export'
import { filterByBranchIds } from '@/utils/filtering'

export default {
    name: 'Records',
    components: { AppBar, Table, ErrorDialog, FilterDrawer, ScopeTab, InfoTable },
    data() {
        return {
            scope: 'borrowed',
            suppressScopeWatcher: false,
            skipApplyAfterLoad: false,
            records: [],
            filteredRecords: [],
            totalRecords: 0,
            itemsPerPage: 10,
            tableOptions: {
                page: 1,
                itemsPerPage: 10,
                sortBy: [],
            },
            loading: false,
            filters: {
                search: '',
                status: [],
                branch: [],
                dateAddedFrom: '',
                dateAddedTo: ''
            },
            recordStatusOptions: [
                { value: 'borrowed', title: 'Borrowed' },
                { value: 'returned', title: 'Returned' },
                { value: 'overdue', title: 'Overdue' },
                { value: 'lost', title: 'Lost' },
            ],
            recordScopes: [
                { value: 'all', label: 'All' },
                { value: 'borrowed', label: 'Borrowed' },
                { value: 'returned', label: 'Returned' },
                { value: 'overdue', label: 'Overdue' },
                { value: 'lost', label: 'Lost' },
                { value: 'archived', label: 'Archived' },
            ],
            branches: [],
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: false
            },
            viewDialogVisible: false,
            viewTitle: '',
            viewFields: [],
            editDialogVisible: false,
            editRecordLoading: false,
            selectedRecord: null,
            editRecordForm: {
                status: 'borrowed',
                due_date: '',
                is_penalized: false,
                is_fine_paid: false,
                penalty_amount: 0,
                remarks: ''
            },
            statusEditOptions: [
                { value: 'borrowed', label: 'Borrowed' },
                { value: 'returned', label: 'Returned' },
                { value: 'overdue', label: 'Overdue' },
                { value: 'lost', label: 'Lost' }
            ],
            recordsHeaders: [
                { text: 'ID', value: 'id' },
                { text: 'Borrowed Book', value: 'borrowedBook' },
                { text: 'Borrower Name', value: 'borrowerName' },
                { text: 'Due Date', value: 'dueDate' },
                { text: 'Status', value: 'status' },
                { text: 'Date Updated (Borrowed)', value: 'dateUpdated' },
                { text: 'Actions', value: 'actions', sortable: false }
            ],
            debounceTimer: null,
            DEBOUNCE_DELAY: 500
        }
    },
    computed: {
        displayHeaders() {
            // Start with a shallow clone of the base headers
            const headers = (this.recordsHeaders || []).slice()
            // If scope is overdue or lost, insert penalized and fine-paid columns before dateUpdated
            if (this.scope === 'overdue' || this.scope === 'lost') {
                const insertIndex = headers.findIndex(h => h.value === 'dateUpdated')
                const penalizedHeader = { text: 'Penalized', value: 'is_penalized' }
                const finePaidHeader = { text: 'Fine Paid', value: 'is_fine_paid' }
                const idx = insertIndex >= 0 ? insertIndex : headers.length - 1
                headers.splice(idx, 0, penalizedHeader)
                headers.splice(idx + 1, 0, finePaidHeader)
            }
            return headers
        }
    },
    mounted() {
        this.loadBranches()
        this.loadItems({
            page: 1,
            itemsPerPage: this.itemsPerPage,
            sortBy: [],
        })
        this.setupEventListener()
    },
    watch: {
        scope() {
            // Reload records from backend when scope changes
            if (this.suppressScopeWatcher) {
                this.suppressScopeWatcher = false
                return
            }

            this.loadItems({
                page: 1,
                itemsPerPage: this.itemsPerPage,
                sortBy: this.tableOptions.sortBy || [],
            })
        },
    },
    beforeUnmount() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer)
        }
    },
    methods: {
        async onApplyFilters(newFilters) {
            this.filters = { ...newFilters }

            // Switch to All scope and fetch backend-driven filtered results
            this.suppressScopeWatcher = true
            this.scope = 'all'
            this.tableOptions.page = 1
            await this.fetchFilteredRecordsFromServer()
        },

        async fetchFilteredRecordsFromServer() {
            this.loading = true
            try {
                const scopeFilters = this.getScopeFilters() || {}
                const params = {
                    ...scopeFilters,
                    status: (this.filters.status && this.filters.status.length > 0) ? this.filters.status[0] : undefined,
                    search: this.filters.search || undefined,
                    date_added_from: this.filters.dateAddedFrom || undefined,
                    date_added_to: this.filters.dateAddedTo || undefined,
                    page: this.tableOptions.page,
                    itemsPerPage: this.tableOptions.itemsPerPage,
                }

                // send branch filter as branch_id to backend (scalar when single selection)
                if (this.filters.branch && this.filters.branch.length === 1) {
                    params.branch = this.filters.branch[0]
                } else if (this.filters.branch && this.filters.branch.length > 1) {
                    params.branch = this.filters.branch
                }

                const resp = await fetchBorrowsPage(params)
                const { items, total } = resp

                const raw = Array.isArray(items) ? items : []
                this.records = raw.map(record => {
                    const bookObj = record.book || {}
                    const catalogue = bookObj.catalogue || record.catalogue || {}
                    const student = record.student || {}

                    const borrowerName = (student.first_name || student.name || '')
                        + (student.middle_name ? ' ' + student.middle_name : '')
                        + (student.last_name ? ' ' + student.last_name : '')
                        + (student.suffix ? ' ' + student.suffix : '')

                    const bookTitle = catalogue.title || bookObj.title || record.book_title || ''
                    const bookCode = bookObj.reference_number || record.reference_number || record.book_code || ''

                    return {
                        id: record.id,
                        borrowedBook: bookTitle,
                        branch_id: record.branch?.id ?? record.branch_id ?? record.book?.branch_id ?? null,
                        borrowerName: borrowerName.trim() || (student.name || ''),
                        dueDate: record.due_date ? new Date(record.due_date).toLocaleDateString() : '',
                        status: record.status || 'borrowed',
                        dateUpdated: record.created_at ? new Date(record.created_at).toLocaleDateString() : '',
                        created_at: record.created_at,
                        rawDueDate: record.due_date || '',
                        is_penalized: !!record.is_penalized,
                        is_fine_paid: !!record.is_fine_paid,
                        penalty_amount: record.penalty_amount || (record.penalty?.amount || 0),
                        remarks: record.remarks || '',
                        is_extended: !!record.is_extended,
                        extension_days: record.extension_days || 0,
                        is_archived: !!record.is_archived,
                        bookTitle,
                        bookCode,
                        studentId: student.student_id || record.student_id || student.id || '',
                        studentName: borrowerName.trim() || (student.name || ''),
                    }
                })

                this.totalRecords = typeof total === 'number' ? total : this.records.length
                this.filteredRecords = this.records.slice()
            } catch (error) {
                console.error('Failed to fetch filtered records from server:', error)
                this.showDialog('Load Error', error.message || 'Failed to load records', true)
                this.records = []
                this.filteredRecords = []
            } finally {
                this.loading = false
            }
        },
        async loadBranches() {
            try {
                this.branches = await listActiveBranchesCached()
            } catch (error) {
                console.error('Error loading branches:', error.message)
                this.branches = []
            }
        },
        async loadItems({ page, itemsPerPage, sortBy }) {
            console.log('loadItems called with', { page, itemsPerPage, sortBy, scope: this.scope, filters: this.filters })
            this.loading = true
            this.tableOptions = {
                page: page || 1,
                itemsPerPage: itemsPerPage || this.itemsPerPage,
                sortBy: sortBy || [],
            }

            try {
                const scopeFilters = this.getScopeFilters()
                const resp = await fetchBorrowsPage({
                    ...scopeFilters,
                    page: this.tableOptions.page,
                    itemsPerPage: this.tableOptions.itemsPerPage,
                })
                const { items, total } = resp

                const raw = Array.isArray(items) ? items : []
                this.records = raw.map(record => {
                    const bookObj = record.book || {}
                    const catalogue = bookObj.catalogue || record.catalogue || {}
                    const student = record.student || {}

                    const borrowerName = (student.first_name || student.name || '')
                        + (student.middle_name ? ' ' + student.middle_name : '')
                        + (student.last_name ? ' ' + student.last_name : '')
                        + (student.suffix ? ' ' + student.suffix : '')

                    const bookTitle = catalogue.title || bookObj.title || record.book_title || ''
                    const bookCode = bookObj.reference_number || record.reference_number || record.book_code || ''

                    return {
                        id: record.id,
                        borrowedBook: bookTitle,
                        branch_id: record.branch?.id ?? record.branch_id ?? record.book?.branch_id ?? null,
                        borrowerName: borrowerName.trim() || (student.name || ''),
                        dueDate: record.due_date ? new Date(record.due_date).toLocaleDateString() : '',
                        status: record.status || 'borrowed',
                        // Date Updated (Date Borrowed)
                        dateUpdated: record.created_at ? new Date(record.created_at).toLocaleDateString() : '',
                        created_at: record.created_at,
                        rawDueDate: record.due_date || '',
                        is_penalized: !!record.is_penalized,
                        is_fine_paid: !!record.is_fine_paid,
                        penalty_amount: record.penalty_amount || (record.penalty?.amount || 0),
                        remarks: record.remarks || '',
                        is_extended: !!record.is_extended,
                        extension_days: record.extension_days || 0,
                        is_archived: !!record.is_archived,
                        // helper fields for filtering
                        bookTitle,
                        bookCode,
                        studentId: student.student_id || record.student_id || student.id || '',
                        studentName: borrowerName.trim() || (student.name || ''),
                    }
                })

                try {
                    console.log('loadItems: scope=', this.scope, 'rawItemsCount=', raw.length, 'rawSample=', raw.slice(0,3))
                    console.log('loadItems: mappedRecordsCount=', this.records.length, 'mappedSample=', this.records.slice(0,3))
                    if ((this.scope === 'overdue' || this.scope === 'lost') && this.records.length === 0) {
                        console.warn(`No records mapped for scope=${this.scope}; check backend response and mapping.`)
                    }
                } catch (e) { /* ignore logging errors */ }

                this.totalRecords = typeof total === 'number' ? total : this.records.length

                if (this.skipApplyAfterLoad) {
                    this.filteredRecords = this.records.slice()
                    this.skipApplyAfterLoad = false
                } else {
                    this.applyFilters()
                }
                console.log('Records loaded:', this.records)
            } catch (error) {
                console.error('Failed to load records:', error)
                this.showDialog('Load Error', error.message || 'Failed to load borrow records', true)
            } finally {
                this.loading = false
            }
        },
        
        /**
         * Map current scope to backend filters for borrow records.
         */
        getScopeFilters() {
            if (this.scope === 'all') {
                    return { status: null, archived: 'false' }
                }
                if (this.scope === 'borrowed') {
                    return { status: 'borrowed', archived: 'false' }
                }
                if (this.scope === 'returned') {
                    return { status: 'returned', archived: 'false' }
                }
                if (this.scope === 'overdue') {
                    return { status: 'overdue', archived: 'false' }
                }
                if (this.scope === 'lost') {
                    return { status: 'lost', archived: 'false' }
                }
                if (this.scope === 'archived') {
                    return { archived: 'true' }
                }
                return {}
        },
        async applyFilters() {
            // If the appbar search was cleared, refetch from server for the current scope once
            if (!this.filters.search) {
                this.tableOptions.page = 1
                this.skipApplyAfterLoad = true
                await this.loadItems({ page: this.tableOptions.page, itemsPerPage: this.tableOptions.itemsPerPage, sortBy: this.tableOptions.sortBy || [] })
                return
            }

            // If a search query exists, always run server-driven search (send on each keystroke)
            if (this.filters.search && this.filters.search.length > 0) {
                // keep current scope in the request so backend can apply scope filters
                await this.fetchFilteredRecordsFromServer()
                return
            }

            // Fallback to client-side filtering when no server call was made
            let filtered = this.records.slice()

            // Filter by search (Student ID, Student Name, Book Code, Book Title)
            if (this.filters.search) {
                const q = String(this.filters.search).toLowerCase()
                filtered = filtered.filter(record =>
                    (record.studentId && String(record.studentId).toLowerCase().includes(q)) ||
                    (record.studentName && String(record.studentName).toLowerCase().includes(q)) ||
                    (record.bookCode && String(record.bookCode).toLowerCase().includes(q)) ||
                    (record.bookTitle && String(record.bookTitle).toLowerCase().includes(q))
                )
            }

            // Filter by status
            if (this.filters.status && this.filters.status.length > 0) {
                filtered = filtered.filter(record => this.filters.status.includes(record.status))
            }

            // Filter by Branch
            if (this.filters.branch && this.filters.branch.length > 0) {
                filtered = filterByBranchIds(filtered, this.filters.branch, (rec) => rec.branch_id)
            }

            // Filter by date added range
            if (this.filters.dateAddedFrom || this.filters.dateAddedTo) {
                filtered = filtered.filter(record => {
                    const recordDate = record.created_at ? new Date(record.created_at) : null
                    if (!recordDate) return true
                    
                    if (this.filters.dateAddedFrom) {
                        const fromDate = new Date(this.filters.dateAddedFrom)
                        if (recordDate < fromDate) return false
                    }
                    
                    if (this.filters.dateAddedTo) {
                        const toDate = new Date(this.filters.dateAddedTo)
                        toDate.setHours(23, 59, 59, 999)
                        if (recordDate > toDate) return false
                    }
                    
                    return true
                })
            }

            this.filteredRecords = filtered
            try {
                console.log('applyFilters -> filteredRecords.length=', this.filteredRecords.length, 'scope=', this.scope, 'filters=', this.filters)
            } catch (e) {}
        },
        setupEventListener() {
            if (typeof window !== 'undefined' && window.Pusher) {
                try {
                    // Subscribe to action updates
                    const channel = window.pusherInstance?.subscribe('actions')
                    if (channel) {
                        channel.bind('action:borrow', (data) => {
                            // Debounce reload to avoid excessive API calls
                            if (this.debounceTimer) clearTimeout(this.debounceTimer)
                            this.debounceTimer = setTimeout(() => {
                                this.loadItems(this.tableOptions)
                            }, this.DEBOUNCE_DELAY)
                        })
                        console.log('Real-time listener for borrow events setup')
                    }
                } catch (error) {
                    console.warn('Could not setup real-time listener:', error.message)
                }
            }
        },
        showDialog(title, message, isError = false) {
            this.dialog = {
                visible: true,
                title,
                message,
                isError
            }
        },
        onDownloadCsv() {
            exportAsCsv(this.filteredRecords, this.recordsHeaders, 'records.csv')
        },
        onDownloadJson() {
            exportAsJson(this.filteredRecords, 'records.json')
        },
        viewRecord(item) {
            if (!item) return
            // ensure edit dialog is closed when viewing
            this.editDialogVisible = false
            this.selectedRecord = null

            this.viewTitle = `Borrow #${item.id}`
            const fields = [
                { label: 'ID', value: item.id },
                { label: 'Borrowed Book', value: item.borrowedBook },
                { label: 'Book Code', value: item.bookCode || item.bookCode || '' },
                { label: 'Borrower Name', value: item.borrowerName },
                { label: 'Student ID', value: item.studentId || '' },
                { label: 'Due Date', value: item.rawDueDate || item.dueDate || '' },
                { label: 'Status', value: item.status },
                { label: 'Penalty Amount', value: item.penalty_amount || 0 },
                { label: 'Fine Paid', value: item.is_fine_paid },
                { label: 'Remarks', value: item.remarks || '' },
                { label: 'Date Borrowed', value: item.created_at || item.dateUpdated || '' }
            ]
            this.viewFields = fields
            this.viewDialogVisible = true
        },
        openEditRecord(item) {
            // close view dialog if open to avoid both dialogs showing
            this.viewDialogVisible = false
            this.viewTitle = ''
            this.viewFields = []

            this.selectedRecord = item
            this.editRecordForm = {
                status: item.status || 'borrowed',
                due_date: item.rawDueDate || '',
                is_penalized: !!item.is_penalized,
                is_fine_paid: !!item.is_fine_paid,
                penalty_amount: item.penalty_amount || 0,
                remarks: item.remarks || ''
            }
            this.editDialogVisible = true
        },
        closeEditDialog() {
            this.editDialogVisible = false
            this.selectedRecord = null
        },
        async saveEditRecord() {
            if (!this.selectedRecord) return

            this.editRecordLoading = true
            try {
                const payload = {
                    status: this.editRecordForm.status,
                    due_date: this.editRecordForm.due_date || null,
                    is_penalized: this.editRecordForm.is_penalized,
                    is_fine_paid: this.editRecordForm.is_fine_paid,
                    penalty_amount: this.editRecordForm.penalty_amount || 0,
                    remarks: this.editRecordForm.remarks || ''
                }

                await updateBorrowRecord(this.selectedRecord.id, payload)
                this.showDialog('Success', 'Borrow record updated successfully.')
                this.closeEditDialog()
                this.loadItems(this.tableOptions)
            } catch (error) {
                console.error('Failed to update borrow record:', error)
                const message = error.response?.data?.message || error.message || 'Failed to update borrow record.'
                this.showDialog('Update Error', message, true)
            } finally {
                this.editRecordLoading = false
            }
        },
        async markLost() {
            if (!this.selectedRecord || !this.selectedRecord.id) return this.showDialog('Error', 'No record selected to mark as lost.', true)
            if (!confirm('Mark this borrow record as LOST?')) return
            this.editRecordLoading = true
            try {
                const payload = { status: 'lost', is_fine_paid: !!this.editRecordForm.is_fine_paid }
                await updateBorrowRecord(this.selectedRecord.id, payload)
                this.showDialog('Success', 'Borrow marked as lost.')
                this.closeEditDialog()
                await this.loadItems(this.tableOptions)
            } catch (error) {
                console.error('Failed to mark lost:', error)
                const message = error.response?.data?.message || error.message || 'Failed to mark as lost.'
                this.showDialog('Error', message, true)
            } finally {
                this.editRecordLoading = false
            }
        },
        async archiveRecord(item) {
            if (!item || !item.id) {
                console.warn('archiveRecord called without valid item:', item)
                return
            }

            if (!window.confirm('Are you sure you want to archive this record?')) {
                return
            }

            try {
                await archiveBorrowRecord(item.id)
                this.showDialog('Success', 'Record archived successfully.')
                this.loadItems(this.tableOptions)
            } catch (error) {
                console.error('Failed to archive record:', error)
                const message = error.response?.data?.message || error.message || 'Failed to archive record.'
                this.showDialog('Archive Error', message, true)
            }
        },
        async restoreRecord(item) {
            if (!item || !item.id) {
                console.warn('restoreRecord called without valid item:', item)
                return
            }

            try {
                await restoreBorrowRecord(item.id)
                this.showDialog('Success', 'Record restored successfully.')
                this.loadItems(this.tableOptions)
            } catch (error) {
                console.error('Failed to restore record:', error)
                const message = error.response?.data?.message || error.message || 'Failed to restore record.'
                this.showDialog('Restore Error', message, true)
            }
        }
    }
}
</script>