<template>
    <v-container fluid>
        <v-row>
            <v-col cols="12">
                <AppBar title="Manage Books">
                    <template #search-actions>
                        <v-text-field 
                            density="compact" 
                            v-model="filters.search" 
                            label="Search" 
                            variant="solo-filled"
                            hide-details="auto" 
                            @input="onSearch" 
                            style="max-width:360px;" 
                            prepend-inner-icon="fas fa-magnifying-glass"
                        />
                    </template>

                    <!-- Add Book button removed because backend does not support creating books -->
                </AppBar>

                <!-- Scope Tab Component Above Table -->
                <ScopeTab
                    v-model="scope"
                    :scopes="bookScopes"
                    class="mt-4 mb-4"
                />

                <!-- Filter Drawer Component -->
                <FilterDrawer
                    v-model="filters"
                    :filters="['search', 'status', 'branch', 'dateAddedRange']"
                    :statusOptions="bookStatusOptions"
                    :branchOptions="branches"
                    @apply="onApplyFilters"
                />

                <!-- Reusable table component -->
                <Table
                    :headers="bookHeaders"
                    :items="books"
                    :items-length="totalBooks"
                    :loading="loading"
                    v-model:items-per-page="itemsPerPage"
                    item-key="id"
                    @update:options="loadItems"
                >
                    <template #cell-expiration="{ item }">
                        <span v-if="isExpired(item.expiration)" style="color:#d32f2f;font-weight:600">expired</span>
                        <span v-else>{{ formatDate(item.expiration) }}</span>
                    </template>
                    <template #cell-branch_name="{ item }">
                        <v-chip :color="branchColor(item.branch_name, item.branch_id)" size="small" variant="elevated">
                            {{ item.branch_name }}
                        </v-chip>
                    </template>
                    <template #actions="{ item }">
                        <v-btn icon="fa-eye" size="x-small" variant="plain" @click.stop="viewBook(item)"></v-btn>
                        <v-btn v-if="canShowEditButton(item)" icon="fa-pencil" size="x-small" variant="plain"
                            @click.stop="editBook(item)"></v-btn>
                        <v-btn icon="fa-qrcode" size="x-small" variant="plain" @click.stop="printQr(item)"></v-btn>
                        <v-btn v-if="canArchive && scope === 'active'" icon="fa-box-archive" size="x-small" variant="plain"
                            @click.stop="archiveBookAction(item)"></v-btn>
                        <v-btn v-if="canRestore && scope === 'archived'" icon="fa-rotate-left" size="x-small" variant="plain"
                            @click.stop="restoreBookAction(item)" title="Restore"></v-btn>
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
        <ErrorDialog
            :visible.sync="dialog.visible"
            :title="dialog.title"
            :message="dialog.message"
            :isError="dialog.isError"
            @update:visible="dialog.visible = $event"
        />

        <!-- Confirm Dialog -->
        <v-dialog v-model="confirmDialog.visible" max-width="480px">
            <v-card>
                <v-card-title class="text-h6">{{ confirmDialog.title }}</v-card-title>
                <v-card-text>
                    <div>{{ confirmDialog.message }}</div>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="confirmDialog.visible = false">Cancel</v-btn>
                    <v-btn color="primary" @click="confirmDialogConfirmed">Confirm</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-container>
</template>

<script>
import Table from '../components/Table.vue';
import AppBar from '../components/AppBar.vue';
import ScopeTab from '../components/ScopeTab.vue';
import FilterDrawer from '../components/FilterDrawer.vue';
import ErrorDialog from '@/components/ErrorDialog.vue'
import { exportAsCsv, exportAsJson } from '@/services/export'
import { printQrCodes } from '@/services/qrPrint'
import { fetchBooksPage, archiveBook, restoreBook } from '@/services/book'
import { subscribeToActions, waitForEchoConnection } from '@/services/realtime'
import { ACTIONS, can as canCheck, requirePermission } from '@/services/permission';
import { getSession } from '@/services/auth';
import { filterByBranchIds } from '@/utils/filtering'
import { listActiveBranchesCached } from '@/services/branch'

export default {
    name: 'ManageBooks',
    components: { Table, AppBar, ScopeTab, FilterDrawer, ErrorDialog },
    data() {
        return {
            loading: false,
            search: '',
            scope: 'active',
            suppressScopeWatcher: false,
            skipApplyAfterLoad: false,
            scopeCounts: {
                active: null,
                archived: null,
            },
            books: [],
            allBooks: [],
            totalBooks: 0,
            itemsPerPage: 10,
            tableOptions: {
                page: 1,
                itemsPerPage: 10,
                sortBy: [],
            },
            filters: {
                search: '',
                status: [],
                branch: [],
                dateAddedFrom: '',
                dateAddedTo: ''
            },
            bookStatusOptions: [
                { value: 'active', title: 'Active' },
                { value: 'for_archiving', title: 'For Archiving' },
                { value: 'lost', title: 'Lost' },
                { value: 'damaged', title: 'Damaged' },
                { value: 'under_repair', title: 'Under Repair' },
            ],
            branches: [],
            bookScopes: [
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'for_archiving', label: 'For Archiving' },
                { value: 'lost', label: 'Lost' },
                { value: 'damaged', label: 'Damaged' },
                { value: 'under_repair', label: 'Under Repair' },
            ],
            bookHeaders: [
                { text: 'Internal ID', value: 'id' },
                { text: 'Reference No.', value: 'reference_number' },
                { text: 'Title', value: 'title' },
                { text: 'Author', value: 'author' },
                { text: 'Year', value: 'year_of_publication' },
                { text: 'Edition', value: 'edition' },
                { text: 'Copy No.', value: 'copy_number' },
                { text: 'Branch', value: 'branch_name' },
                { text: 'Status', value: 'book_status' },
                { text: 'Actions', value: 'actions', sortable: false },
            ],
            canArchive: canCheck(ACTIONS.ARCHIVE),
            canEdit: canCheck(ACTIONS.EDIT),
            canCreate: canCheck(ACTIONS.CREATE),
            canRestore: canCheck(ACTIONS.ARCHIVE),
            pollingInterval: null,
            loadBooksTimeout: null,
            isRealtimeUpdate: false,
            handleRealtimeUpdate: null,
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: true,
            },
            confirmDialog: {
                visible: false,
                title: '',
                message: '',
                action: null,
                payload: null,
            },
        };
    },
    watch: {
        scope() {
            // Allow programmatic suppression
            if (this.suppressScopeWatcher) {
                this.suppressScopeWatcher = false
                return
            }

            // Reset non-scope filters and reload books from backend using scope filters
            this.onScopeChange()
            this.loadItems({
                page: 1,
                itemsPerPage: this.itemsPerPage,
                sortBy: this.tableOptions.sortBy || [],
            })
        }
    },
    mounted() {
        // Auto-filter by authenticated user's branch ID (except for super_admin)
        const session = getSession()
        if (session && session.role !== 'super_admin' && session.branch_id) {
            const sessionBranchId = Number(session.branch_id)
            this.filters.branch = Number.isFinite(sessionBranchId) ? [sessionBranchId] : [session.branch_id]
        }
        this.loadBranches()
        this.loadItems({
            page: 1,
            itemsPerPage: this.itemsPerPage,
            sortBy: [],
        })
        window.addEventListener('storage', this.updatePermissions)
        
        this.handleRealtimeUpdate = (event) => {
            if (event.detail.action === 'create' || event.detail.action === 'update' || 
                event.detail.action === 'archive' || event.detail.action === 'restore') {
                
                if (this.loadBooksTimeout) {
                    clearTimeout(this.loadBooksTimeout)
                }
                
                this.isRealtimeUpdate = true
                this.loadBooksTimeout = setTimeout(async () => {
                    await this.loadItems(this.tableOptions)
                    this.isRealtimeUpdate = false
                }, 500)
            }
        }
        
        window.addEventListener('action:book', this.handleRealtimeUpdate)
    },
    beforeUnmount() {
        window.removeEventListener('storage', this.updatePermissions)
        
        if (this.handleRealtimeUpdate) {
            window.removeEventListener('action:book', this.handleRealtimeUpdate)
        }
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval)
        }
        if (this.loadBooksTimeout) {
            clearTimeout(this.loadBooksTimeout)
        }
    },
    methods: {
        async loadBranches() {
            try {
                const rawBranches = await listActiveBranchesCached()
                this.branches = Array.isArray(rawBranches)
                    ? rawBranches.map(branch => {
                        const id = Number(branch.id)
                        return {
                            id: Number.isFinite(id) ? id : branch.id,
                            name: branch.name || branch.code || branch.description || `Branch ${branch.id}`,
                        }
                    })
                    : []
                console.log('ManageBooks loaded branches for filter:', this.branches)
            } catch (error) {
                console.error('Failed to load branches:', error)
                this.branches = []
            }
        },
        async loadItems({ page, itemsPerPage, sortBy }) {
            console.log('ManageBooks.loadItems called with:', {
                page,
                itemsPerPage,
                sortBy,
                scope: this.scope,
            })
            if (!this.isRealtimeUpdate) {
                this.loading = true
            }

            this.tableOptions = {
                page: page || 1,
                itemsPerPage: itemsPerPage || this.itemsPerPage,
                sortBy: sortBy || [],
            }

            console.log('ManageBooks.tableOptions set to:', this.tableOptions)

            try {
                const scopeFilters = this.getScopeFilters()
                console.log('ManageBooks.getScopeFilters returned:', scopeFilters)
                const { items, total } = await fetchBooksPage({
                    ...scopeFilters,
                    page: this.tableOptions.page,
                    itemsPerPage: this.tableOptions.itemsPerPage,
                })

                console.log('ManageBooks.fetchBooksPage response meta:', {
                    rawItemsType: Array.isArray(items) ? 'array' : typeof items,
                    rawItemsLength: Array.isArray(items) ? items.length : 0,
                    total,
                })

                this.allBooks = (Array.isArray(items) ? items : []).map(book => ({
                    ...book,
                    branch_id: book.branch?.id ?? book.branch_id ?? null,
                    branch_name: book.branch?.name || `Branch ${book.branch_id || (book.branch && book.branch.id) || ''}`,
                }))

                console.log('ManageBooks.allBooks length after mapping:', this.allBooks.length)
                this.totalBooks = typeof total === 'number' ? total : this.allBooks.length

                console.log('ManageBooks.totalBooks set to:', this.totalBooks)

                this.applyFilters()
            } catch (error) {
                console.error('Error loading books:', error.message)
                this.books = []
            } finally {
                this.loading = false
            }
        },
        /**
         * Map current scope to backend filters for books.
         */
        getScopeFilters() {
            if (this.scope === 'all') {
                return { status: null, archived: 'false' }
            }
            if (this.scope === 'active') {
                // All books whose book_status is "active" and not archived
                return { status: 'active', archived: 'false' }
            }
            if (this.scope === 'for_archiving') {
                return { status: 'for_archiving', archived: 'false' }
            }
            if (this.scope === 'lost') {
                return { status: 'lost', archived: 'false' }
            }
            if (this.scope === 'damaged') {
                return { status: 'damaged', archived: 'false' }
            }
            if (this.scope === 'under_repair') {
                return { status: 'under_repair', archived: 'false' }
            }
            if (this.scope === 'archived') {
                return { archived: 'true' }
            }
            return {}
        },
        filterBooks(bookList) {
            const q = this.search && this.search.toLowerCase();
            if (!q) {
                return bookList && Array.isArray(bookList) ? bookList.slice() : [];
            }
            if (!bookList || !Array.isArray(bookList)) {
                return [];
            }
            return bookList.filter(b => {
                const searchStr = [
                    b.id, b.copy_number, b.reference_number, b.title, b.author, b.publisher, 
                    b.year_of_publication, b.edition, b.cataloging_status, b.isbn
                ].filter(v => v).join(' ').toLowerCase();
                return searchStr.includes(q);
            });
        },
        scopeFilterBooks(bookList) {
            let items = Array.isArray(bookList) ? bookList : []
            if (this.scope === 'active') {
                items = items.filter(b => !b.is_archived)
            } else if (this.scope === 'for_archiving') {
                items = items.filter(b => b.book_status === 'for_archiving' && !b.is_archived)
            } else if (this.scope === 'lost') {
                items = items.filter(b => b.book_status === 'lost' && !b.is_archived)
            } else if (this.scope === 'damaged') {
                items = items.filter(b => b.book_status === 'damaged' && !b.is_archived)
            } else if (this.scope === 'under_repair') {
                items = items.filter(b => b.book_status === 'under_repair' && !b.is_archived)
            } else if (this.scope === 'archived') {
                items = items.filter(b => b.is_archived)
            }
            return items
        },
        updatePermissions() {
            this.canArchive = canCheck(ACTIONS.ARCHIVE)
            this.canEdit = canCheck(ACTIONS.EDIT)
            this.canCreate = canCheck(ACTIONS.CREATE)
        },
        canEditBook(book) {
            try {
                const session = getSession()
                const role = session && session.role ? String(session.role).toLowerCase() : ''

                // Super admin can edit all
                if (role === 'super_admin') return true

                // Admins cannot edit
                if (role === 'admin') return false

                // Branch admin can edit only books in their branch
                if (role === 'branch_admin') {
                    const sessionBranch = session.branch_id != null ? Number(session.branch_id) : session.branch_id
                    return sessionBranch != null && Number(book.branch_id) === Number(sessionBranch)
                }
            } catch (e) {
                // fallback
            }

            return this.canEdit
        },
        canShowEditButton(book) {
            // Requested: show Edit in All / For Archiving / Lost / Damaged / Under Repair (and keep it in Active).
            // Do not show edit for archived items.
            if (!book) return false
            if (this.scope === 'archived') return false
            if (book.is_archived) return false
            return this.canEditBook(book)
        },
        viewBook(item) {
            // navigate to view details for this book
            if (!item || !item.id) {
                console.warn('viewBook called without valid item:', item);
                return;
            }
            this.$router.push({ name: 'view-book', params: { bookCode: item.id } });
        },
        editBook(item) {
            // navigate to edit view for this book
            if (!item || !item.id) {
                console.warn('editBook called without valid item:', item);
                return;
            }
            // Enforce role-based access: only branch_admin (own branch) and super_admin.
            if (!this.canEditBook(item)) {
                this.dialog = {
                    visible: true,
                    title: 'Permission Denied',
                    message: 'You do not have permission to edit this item.',
                    isError: true,
                }
                return;
            }
            this.$router.push({ name: 'edit-book', params: { bookCode: item.id } });
        },
        // Archive action
        async archiveBookAction(item) {
            if (!item || !item.id) {
                console.warn('archiveBook called without valid item:', item);
                return;
            }
            if (!canCheck(ACTIONS.ARCHIVE)) {
                this.dialog = {
                    visible: true,
                    title: 'Permission Denied',
                    message: 'You do not have permission to archive this item.',
                    isError: true,
                }
                return;
            }

            // show confirm dialog and perform archive on confirm
            this.openConfirm(async (payload) => {
                try {
                    await archiveBook(payload)
                    await this.loadItems(this.tableOptions)
                    this.dialog = { visible: true, title: 'Success', message: 'Book archived', isError: false }
                } catch (error) {
                    console.error('Error archiving book:', error)
                    const message = error.response?.data?.message || error.message || 'Unknown error'
                    this.dialog = { visible: true, title: 'Archive Failed', message, isError: true }
                }
            }, 'Archive Book', 'Are you sure you want to archive this book?', item.id)
        },
        // Restore action
        async restoreBookAction(item) {
            if (!item || !item.id) {
                console.warn('restoreBook called without valid item:', item);
                return;
            }

            this.openConfirm(async (payload) => {
                try {
                    await restoreBook(payload)
                    await this.loadItems(this.tableOptions)
                    this.dialog = { visible: true, title: 'Success', message: 'Book restored', isError: false }
                } catch (error) {
                    console.error('Error restoring book:', error)
                    const message = error.response?.data?.message || error.message || 'Unknown error'
                    this.dialog = { visible: true, title: 'Restore Failed', message, isError: true }
                }
            }, 'Restore Book', 'Are you sure you want to restore this book?', item.id)
        },
        onScopeChange() {
            this.filters.search = ''
            this.filters.status = []
            this.filters.dateAddedFrom = ''
            this.filters.dateAddedTo = ''
        },
        // Download handlers using export service
        onDownloadCsv() {
            exportAsCsv(this.books, this.bookHeaders, 'books.csv');
        },
        onDownloadJson() {
            exportAsJson(this.books, 'books.json');
        },
        onSearch() {
            // Treat search as server-driven: apply current filters via server
            this.onApplyFilters(this.filters)
        },
        applyFilters() {
            console.log('ManageBooks.applyFilters called with:', {
                scope: this.scope,
                filters: { ...this.filters },
                allBooksLength: this.allBooks.length,
                totalBooks: this.totalBooks,
            })
            // If the last load was a server-side apply, skip client-side re-filter
            if (this.skipApplyAfterLoad) {
                this.skipApplyAfterLoad = false
                this.books = this.allBooks.slice()
                return
            }

            let filtered = this.allBooks.slice()

            console.log('ManageBooks.applyFilters start length:', filtered.length)

            // Filter by search (copy number, reference number, title, author, year, edition)
            if (this.filters.search) {
                const q = this.filters.search.toLowerCase()
                filtered = filtered.filter(book =>
                    (book.copy_number && book.copy_number.toString().toLowerCase().includes(q)) ||
                    (book.reference_number && book.reference_number.toLowerCase().includes(q)) ||
                    (book.title && book.title.toLowerCase().includes(q)) ||
                    (book.author && book.author.toLowerCase().includes(q)) ||
                    (book.year_of_publication && book.year_of_publication.toString().toLowerCase().includes(q)) ||
                    (book.edition && book.edition.toLowerCase().includes(q))
                )

                console.log('ManageBooks.applyFilters after search filter length:', filtered.length)
            }

            // Filter by book status
            if (this.filters.status && this.filters.status.length > 0) {
                filtered = filtered.filter(book => this.filters.status.includes(book.book_status))
                console.log('ManageBooks.applyFilters after status filter length:', filtered.length)
            }

            // Filter by branch
            filtered = filterByBranchIds(filtered, this.filters.branch, (book) => book.branch_id)

            console.log('ManageBooks.applyFilters after branch filter length:', filtered.length)

            // Filter by date added range
            if (this.filters.dateAddedFrom || this.filters.dateAddedTo) {
                filtered = filtered.filter(book => {
                    const bookDate = book.created_at ? new Date(book.created_at) : null
                    if (!bookDate) return true
                    
                    if (this.filters.dateAddedFrom) {
                        const fromDate = new Date(this.filters.dateAddedFrom)
                        if (bookDate < fromDate) return false
                    }
                    
                    if (this.filters.dateAddedTo) {
                        const toDate = new Date(this.filters.dateAddedTo)
                        toDate.setHours(23, 59, 59, 999)
                        if (bookDate > toDate) return false
                    }
                    
                    return true
                })

                console.log('ManageBooks.applyFilters after date range filter length:', filtered.length)
            }

            this.books = filtered
            console.log('ManageBooks.applyFilters final books length:', this.books.length)
        },
        async onApplyFilters(newFilters) {
            // Called when FilterDrawer emits Apply. Switch to 'all' scope and fetch server-side.
            this.filters = { ...newFilters }
            this.suppressScopeWatcher = true
            this.scope = 'all'
            await this.fetchFilteredBooksFromServer({ page: 1, itemsPerPage: this.itemsPerPage })
        },
        async fetchFilteredBooksFromServer(opts = {}) {
            const scopeFilters = this.getScopeFilters() || {}
            const params = {
                ...scopeFilters,
                page: opts.page || this.tableOptions.page || 1,
                itemsPerPage: opts.itemsPerPage || this.tableOptions.itemsPerPage || this.itemsPerPage,
            }

            // Merge UI filters into params
            if (this.filters.search) params.search = this.filters.search
            if (this.filters.status && this.filters.status.length === 1) params.status = this.filters.status[0]
            else if (this.filters.status && this.filters.status.length > 1) params.status = this.filters.status
            // backend expects branch_id; send scalar when single selection, array otherwise
            if (this.filters.branch && this.filters.branch.length === 1) params.branch_id = this.filters.branch[0]
            else if (this.filters.branch && this.filters.branch.length > 1) params.branch_id = this.filters.branch
            if (this.filters.dateAddedFrom) params.date_added_from = this.filters.dateAddedFrom
            if (this.filters.dateAddedTo) params.date_added_to = this.filters.dateAddedTo

            this.loading = true
            try {
                const { items, total } = await fetchBooksPage(params)
                this.allBooks = (Array.isArray(items) ? items : []).map(book => ({
                    ...book,
                    branch_id: book.branch?.id ?? book.branch_id ?? null,
                    branch_name: book.branch?.name || `Branch ${book.branch_id || (book.branch && book.branch.id) || ''}`,
                }))
                this.totalBooks = typeof total === 'number' ? total : this.allBooks.length

                // Prevent applyFilters from re-filtering immediately (we already used server-side results)
                this.skipApplyAfterLoad = true
                this.books = this.allBooks.slice()
            } catch (error) {
                console.error('Error fetching filtered books from server:', error)
                this.books = []
            } finally {
                this.loading = false
            }
        },
        openConfirm(actionFn, title = 'Confirm', message = 'Are you sure?', payload = null) {
            this.confirmDialog = { visible: true, title, message, action: actionFn, payload }
        },
        async confirmDialogConfirmed() {
            if (this.confirmDialog && typeof this.confirmDialog.action === 'function') {
                const action = this.confirmDialog.action
                const payload = this.confirmDialog.payload
                this.confirmDialog.visible = false
                try {
                    await action(payload)
                } catch (e) {
                    console.error('Confirm action failed:', e)
                }
            } else {
                this.confirmDialog.visible = false
            }
        },
        branchColor(branchName, branchId) {
            const palette = ['blue', 'green', 'amber', 'red', 'purple', 'teal', 'grey']
            let idx = 0
            if (branchId !== undefined && branchId !== null) {
                const n = Number(branchId)
                if (!Number.isNaN(n)) idx = Math.abs(n) % palette.length
            } else if (branchName) {
                idx = Math.abs(this._hashString(branchName)) % palette.length
            }
            return palette[idx]
        },
        _hashString(s) {
            let h = 0
            if (!s) return h
            for (let i = 0; i < s.length; i++) {
                const ch = s.charCodeAt(i)
                h = ((h << 5) - h) + ch
                h |= 0
            }
            return h
        },
        printQr(item) {
            if (!item) {
                console.warn('printQr called without item');
                return;
            }
            // Print single book QR code with title
            printQrCodes([item], item.title || 'QR Code');
        },
    },
};
</script>

<style scoped>
.mb-4 {
    margin-bottom: 1rem;
}
</style>
