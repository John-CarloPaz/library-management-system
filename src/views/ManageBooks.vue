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
                            @input="applyFilters" 
                            style="max-width:360px;" 
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
                    :statusOptions="catalogingStatusOptions"
                    :branchOptions="branches"
                    @update:modelValue="applyFilters"
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
                    <template #actions="{ item }">
                        <v-btn icon="fa-eye" size="x-small" variant="plain" @click.stop="viewBook(item)"></v-btn>
                        <v-btn v-if="canEdit && scope === 'active'" icon="fa-pencil" size="x-small" variant="plain"
                            @click.stop="editBook(item)"></v-btn>
                        <v-btn v-if="canArchive && scope === 'active'" icon="fa-box-archive" size="x-small" variant="plain"
                            @click.stop="archiveBookAction(item)"></v-btn>
                        <v-btn v-if="canRestore && scope === 'archived'" icon="fa-rotate-left" size="x-small" variant="plain"
                            @click.stop="restoreBookAction(item)" title="Restore"></v-btn>
                        <v-btn icon="fa-qrcode" size="x-small" variant="plain" @click.stop="printQr(item)"></v-btn>
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
        <ErrorDialog
            :visible.sync="dialog.visible"
            :title="dialog.title"
            :message="dialog.message"
            :isError="dialog.isError"
            @update:visible="dialog.visible = $event"
        />
    </v-container>
</template>

<script>
import Table from '../components/Table.vue';
import AppBar from '../components/AppBar.vue';
import ScopeTab from '../components/ScopeTab.vue';
import FilterDrawer from '../components/FilterDrawer.vue';
import ErrorDialog from '@/components/ErrorDialog.vue'
import { exportAsCsv, exportAsJson, exportAsXml } from '@/services/export'
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
            catalogingStatusOptions: [
                { value: 'pending', title: 'Pending' },
                { value: 'cataloged', title: 'Cataloged' },
                { value: 'available', title: 'Available' }
            ],
            branches: [],
            bookScopes: [
                { value: 'active', label: 'Active' },
                { value: 'for_archiving', label: 'For Archiving' },
                { value: 'lost', label: 'Lost' },
                { value: 'damaged', label: 'Damaged' },
                { value: 'under_repair', label: 'Under Repair' },
                { value: 'archived', label: 'Archived' },
            ],
            bookHeaders: [
                { text: 'Copy No.', value: 'copy_number' },
                { text: 'Reference No.', value: 'reference_number' },
                { text: 'Title', value: 'title' },
                { text: 'Author', value: 'author' },
                { text: 'Branch', value: 'branch_name' },
                { text: 'Year', value: 'year_of_publication' },
                { text: 'Edition', value: 'edition' },
                { text: 'Status', value: 'cataloging_status' },
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
        };
    },
    watch: {
        scope() {
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
                const { items, total } = await fetchBooksPage({
                    ...scopeFilters,
                    page: this.tableOptions.page,
                    itemsPerPage: this.tableOptions.itemsPerPage,
                })

                this.allBooks = (Array.isArray(items) ? items : []).map(book => ({
                    ...book,
                    branch_name: book.branch?.name || `Branch ${book.branch_id}`,
                }))

                this.totalBooks = typeof total === 'number' ? total : this.allBooks.length

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
            if (this.scope === 'active') {
                // All active, non-archived books regardless of specific book_status
                return { active: true, archived: 'false' }
            }
            if (this.scope === 'for_archiving') {
                return { status: 'for_archiving', archived: 'false', active: true }
            }
            if (this.scope === 'lost') {
                return { status: 'lost', archived: 'false', active: true }
            }
            if (this.scope === 'damaged') {
                return { status: 'damaged', archived: 'false', active: true }
            }
            if (this.scope === 'under_repair') {
                return { status: 'under_repair', archived: 'false', active: true }
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
            if (!canCheck(ACTIONS.EDIT)) {
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

            try {
                if (confirm('Are you sure you want to archive this book?')) {
                    await archiveBook(item.id);
                    await this.loadBooks();
                }
            } catch (error) {
                console.error('Error archiving book:', error)
                this.dialog = {
                    visible: true,
                    title: 'Archive Failed',
                    message: 'Error archiving book: ' + (error.message || 'Unknown error'),
                    isError: true,
                }
            }
        },
        // Restore action
        async restoreBookAction(item) {
            if (!item || !item.id) {
                console.warn('restoreBook called without valid item:', item);
                return;
            }

            try {
                if (confirm('Are you sure you want to restore this book?')) {
                    await restoreBook(item.id);
                    await this.loadBooks();
                }
            } catch (error) {
                console.error('Error restoring book:', error)
                this.dialog = {
                    visible: true,
                    title: 'Restore Failed',
                    message: 'Error restoring book: ' + (error.message || 'Unknown error'),
                    isError: true,
                }
            }
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
        onDownloadXml() {
            exportAsXml(this.books, this.bookHeaders, 'books.xml', { rootName: 'books', itemName: 'book' });
        },
        onSearch() {
            this.applyFilters()
        },
        applyFilters() {
            let filtered = this.allBooks.slice()

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
            }

            // Filter by cataloging status
            if (this.filters.status && this.filters.status.length > 0) {
                filtered = filtered.filter(book => this.filters.status.includes(book.cataloging_status))
            }

            // Filter by branch
            filtered = filterByBranchIds(filtered, this.filters.branch, (book) => book.branch_id)

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
            }

            this.books = filtered
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
