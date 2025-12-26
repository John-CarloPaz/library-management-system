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
                    :filters="['search', 'status', 'dateAddedRange']"
                    :statusOptions="recordStatusOptions"
                    @update:modelValue="applyFilters"
                />

                <Table
                    :headers="recordsHeaders"
                    :items="filteredRecords"
                    :items-length="totalRecords"
                    :loading="loading"
                    v-model:items-per-page="itemsPerPage"
                    item-key="id"
                    @update:options="loadItems"
                >
                    <template #actions="{ item }">
                        <v-btn icon="fa-eye" size="x-small" variant="plain" @click.stop="viewRecord(item)"></v-btn>
                        <v-btn icon="fa-pen" size="x-small" variant="plain" @click.stop="openEditRecord(item)"></v-btn>
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
                </Table>
                <div class="mt-4">
                    <span class="mr-1">Download:</span>
                    <a href="#" @click.prevent="onDownloadCsv">CSV</a>
                    <span class="mr-1">,</span>
                    <a href="#" @click.prevent="onDownloadJson">JSON</a>
                    <span class="mr-1">,</span>
                    <a href="#" @click.prevent="onDownloadXml">XML</a>
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
                            readonly
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
                        />
                    </v-col>
                </v-row>

                <v-row>
                    <v-col cols="12" md="4">
                        <v-switch
                            v-model="editRecordForm.is_penalized"
                            label="Penalized"
                        />
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-switch
                            v-model="editRecordForm.is_fine_paid"
                            label="Fine Paid"
                        />
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-text-field
                            v-model.number="editRecordForm.penalty_amount"
                            type="number"
                            min="0"
                            label="Penalty Amount"
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
import { fetchBorrowsPage, updateBorrowRecord } from '../services/borrow.js'
import { listActiveBranchesCached } from '@/services/branch'
import { exportAsCsv, exportAsJson, exportAsXml } from '@/services/export'

export default {
    name: 'Records',
    components: { AppBar, Table, ErrorDialog, FilterDrawer, ScopeTab },
    data() {
        return {
            scope: 'borrowed',
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
                { text: 'Date Updated (Borrowed)', value: 'dateUpdated' }
            ],
            debounceTimer: null,
            DEBOUNCE_DELAY: 500
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
        async loadBranches() {
            try {
                this.branches = await listActiveBranchesCached()
            } catch (error) {
                console.error('Error loading branches:', error.message)
                this.branches = []
            }
        },
        async loadItems({ page, itemsPerPage, sortBy }) {
            this.loading = true
            this.tableOptions = {
                page: page || 1,
                itemsPerPage: itemsPerPage || this.itemsPerPage,
                sortBy: sortBy || [],
            }

            try {
                const scopeFilters = this.getScopeFilters()
                const { items, total } = await fetchBorrowsPage({
                    ...scopeFilters,
                    page: this.tableOptions.page,
                    itemsPerPage: this.tableOptions.itemsPerPage,
                })

                const raw = Array.isArray(items) ? items : []
                this.records = raw.map(record => ({
                    id: record.id,
                    borrowedBook: record.book?.title || record.book_title || '',
                    borrowerName: record.student?.name || record.student_name || '',
                    dueDate: record.due_date ? new Date(record.due_date).toLocaleDateString() : '',
                    status: record.status || 'borrowed',
                    // Date Updated (Date Borrowed)
                    dateUpdated: record.created_at ? new Date(record.created_at).toLocaleDateString() : '',
                    created_at: record.created_at,
                    rawDueDate: record.due_date || '',
                    is_penalized: !!record.is_penalized,
                    is_fine_paid: !!record.is_fine_paid,
                    penalty_amount: record.penalty_amount || 0,
                    remarks: record.remarks || '',
                    is_extended: !!record.is_extended,
                    extension_days: record.extension_days || 0,
                }))

                this.totalRecords = typeof total === 'number' ? total : this.records.length

                this.applyFilters()
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
            if (this.scope === 'borrowed') {
                return { status: 'borrowed', archived: 'false', active: true }
            }
            if (this.scope === 'returned') {
                return { status: 'returned', archived: 'false', active: true }
            }
            if (this.scope === 'overdue') {
                return { status: 'overdue', archived: 'false', active: true }
            }
            if (this.scope === 'lost') {
                return { status: 'lost', archived: 'false', active: true }
            }
            if (this.scope === 'archived') {
                return { archived: 'true' }
            }
            return {}
        },
        applyFilters() {
            let filtered = this.records.slice()

            // Filter by search (Student ID, Student Name, Book Code, Book Title)
            if (this.filters.search) {
                const q = this.filters.search.toLowerCase()
                filtered = filtered.filter(record =>
                    (record.studentId && record.studentId.toLowerCase().includes(q)) ||
                    (record.studentName && record.studentName.toLowerCase().includes(q)) ||
                    (record.bookCode && record.bookCode.toLowerCase().includes(q)) ||
                    (record.bookTitle && record.bookTitle.toLowerCase().includes(q))
                )
            }

            // Filter by status
            if (this.filters.status && this.filters.status.length > 0) {
                filtered = filtered.filter(record => this.filters.status.includes(record.status))
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
        onDownloadXml() {
            exportAsXml(this.filteredRecords, this.recordsHeaders, 'records.xml', { 
                rootName: 'records', 
                itemName: 'record' 
            })
        },
        viewRecord(item) {
            console.log('View record:', item)
            // TODO: Implement detail view dialog or navigation
        },
        openEditRecord(item) {
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
                this.loadRecords()
            } catch (error) {
                console.error('Failed to update borrow record:', error)
                const message = error.response?.data?.message || error.message || 'Failed to update borrow record.'
                this.showDialog('Update Error', message, true)
            } finally {
                this.editRecordLoading = false
            }
        }
    }
}
</script>