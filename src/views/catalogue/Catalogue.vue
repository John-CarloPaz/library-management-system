<template>
    <AppBar title="Catalogue Management">
        <template #search-actions>
            <div>
                <v-text-field density="compact" v-model="filters.search" label="Search Catalogue ID" variant="solo-filled"
                    hide-details="auto" @input="applyFilters" style="max-width:360px;" prepend-inner-icon="fas fa-magnifying-glass" />
            </div>
        </template>

        <template #button-actions v-if="canCreate">
            <v-btn prepend-icon="fa-plus" variant="tonal" @click="createNew">Create Catalogue</v-btn>
        </template>
    </AppBar>

    <v-container fluid>
        <v-row>
            <v-col cols="12" class="mt-8">
                <ScopeTab
                    v-model="scope"
                    :scopes="catalogueScopes"
                />
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12">
                <Table
                    :headers="catalogueHeaders"
                    :items="filteredCatalogues"
                    :items-length="totalCatalogues"
                    :loading="loading"
                    v-model:items-per-page="itemsPerPage"
                    item-key="id"
                    @update:options="loadItems"
                >
                    <template #actions="{ item }">
                        <v-btn icon="fa-eye" size="x-small" variant="plain" @click.stop="viewCatalogue(item)" title="View"></v-btn>
                        <v-btn v-if="canEditCatalogue(item)" icon="fa-pencil" size="x-small" variant="plain" @click.stop="editCatalogue(item)" title="Edit"></v-btn>
                        <v-btn v-if="scope !== 'archived' && item.cataloging_status === 'available'" icon="fa-qrcode" size="x-small" variant="plain" @click.stop="printQrCodes(item)" title="Print QR Codes"></v-btn>
                        <v-btn
                            v-if="scope !== 'archived' && item.cataloging_status !== 'available'"
                            icon="fa-box-archive"
                            size="x-small"
                            variant="plain"
                            @click.stop="archiveCatalogue(item)"
                            title="Archive"
                        ></v-btn>
                        <v-btn v-if="scope === 'archived'" icon="fa-rotate-left" size="x-small" variant="plain" @click.stop="restoreCatalogue(item)" title="Restore"></v-btn>
                    </template>

                    <!-- Custom status column rendering -->
                    <template #cell-cataloging_status="{ item }">
                        <v-chip 
                            :color="getStatusColor(item.cataloging_status)" 
                            size="small"
                            variant="elevated">
                            {{ formatStatus(item.cataloging_status) }}
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

    <!-- Filter Drawer -->
    <FilterDrawer
        v-model="filters"
        :filters="['search', 'status', 'branch', 'dateAddedRange']"
        :statusOptions="catalogueStatusOptions"
        :branchOptions="branches"
        searchLabel="Catalogue ID"
        @update:modelValue="applyFilters"
    />
</template>

<script>
import AppBar from '@/components/AppBar.vue'
import Table from '@/components/Table.vue'
import ScopeTab from '@/components/ScopeTab.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import FilterDrawer from '@/components/FilterDrawer.vue'
import { fetchCataloguesPage, archiveCatalogue, restoreCatalogue, getCatalogue } from '@/services/catalogue'
import { subscribeToActions, waitForEchoConnection } from '@/services/realtime'
import { listBooks } from '@/services/book'
import { exportAsCsv, exportAsJson } from '@/services/export'
import { printQrCodes } from '@/services/qrPrint'
import { ACTIONS, can as canCheck } from '@/services/permission'
import { getSession } from '@/services/auth'
import { filterByBranchIds } from '@/utils/filtering'
import { listActiveBranchesCached } from '@/services/branch'

export default {
    name: 'catalogue',
    components: { AppBar, Table, ScopeTab, ErrorDialog, FilterDrawer },
    data() {
        return {
            loading: false,
            scope: 'available',
            scopeCounts: {
                active: null,
                archived: null,
            },
            catalogues: [],
            filteredCatalogues: [],
            totalCatalogues: 0,
            itemsPerPage: 10,
            tableOptions: {
                page: 1,
                itemsPerPage: 10,
                sortBy: [],
            },
            branches: [],
            filters: {
                search: '',
                status: [],
                method: [],
                branch: [],
                dateAcquired: '',
                dateAddedFrom: '',
                dateAddedTo: '',
            },
            catalogueStatusOptions: [
                { value: 'available', title: 'Available' },
                { value: 'pending', title: 'Pending' },
                { value: 'in_progress', title: 'In Progress' },
                { value: 'cataloged', title: 'Cataloged' },
                { value: 'ready_for_labeling', title: 'Ready for Labeling' },
            ],
            catalogueScopes: [
                { value: 'all', label: 'All' },
                { value: 'available', label: 'Available' },
                { value: 'pending', label: 'Pending' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'cataloged', label: 'Cataloged' },
                { value: 'ready_for_labeling', label: 'Ready for Labeling' },
                { value: 'archived', label: 'Archived' },
            ],
            canCreate: canCheck(ACTIONS.CREATE),
            pollingInterval: null,
            loadCataloguesTimeout: null,
            isRealtimeUpdate: false,
            handleRealtimeUpdate: null,
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: false,
            },
            catalogueHeaders: [
                { text: 'ID', value: 'id' },
                { text: 'Title', value: 'title' },
                { text: 'Author', value: 'author' },
                { text: 'Call Number', value: 'call_number' },
                { text: 'Branch', value: 'branch_name' },
                { text: 'Copies', value: 'number_of_copies' },
                { text: 'Status', value: 'cataloging_status' },
                { text: 'Actions', value: 'actions', sortable: false },
            ],
        }
    },
    watch: {
        scope() {
            // When scope changes, reload catalogues from backend using scope filters
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
        this.handleRealtimeUpdate = (event) => {
            if (event.detail.action === 'create' || event.detail.action === 'update' || 
                event.detail.action === 'archive' || event.detail.action === 'restore') {
                
                if (this.loadCataloguesTimeout) {
                    clearTimeout(this.loadCataloguesTimeout)
                }
                
                this.isRealtimeUpdate = true
                this.loadCataloguesTimeout = setTimeout(async () => {
                    await this.loadItems(this.tableOptions)
                    this.isRealtimeUpdate = false
                }, 500)
            }
        }
        
        window.addEventListener('action:catalogue', this.handleRealtimeUpdate)
    },
    beforeUnmount() {
        if (this.handleRealtimeUpdate) {
            window.removeEventListener('action:catalogue', this.handleRealtimeUpdate)
        }
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval)
        }
        if (this.loadCataloguesTimeout) {
            clearTimeout(this.loadCataloguesTimeout)
        }
    },
    methods: {
        async loadBranches() {
            try {
                this.branches = await listActiveBranchesCached()
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

            console.log('[Catalogue] loadItems called with tableOptions:', this.tableOptions)

            try {
                const scopeFilters = this.getScopeFilters()
                console.log('[Catalogue] getScopeFilters() ->', scopeFilters)
                const { items, total } = await fetchCataloguesPage({
                    ...scopeFilters,
                    page: this.tableOptions.page,
                    itemsPerPage: this.tableOptions.itemsPerPage,
                })

                console.log('[Catalogue] fetchCataloguesPage returned:', {
                    receivedCount: Array.isArray(items) ? items.length : 'non-array',
                    total,
                })

                this.catalogues = (Array.isArray(items) ? items : []).map(cat => ({
                    ...cat,
                    branch_name: cat.branch?.name || `Branch ${cat.branch_id}`,
                }))

                this.totalCatalogues = typeof total === 'number' ? total : this.catalogues.length

                console.log('[Catalogue] normalized catalogues length:', this.catalogues.length, 'totalCatalogues:', this.totalCatalogues)

                this.applyFilters()
            } catch (error) {
                console.error(`Failed to load ${this.scope} catalogues:`, error)
                if (error.response) {
                    console.error('[Catalogue] error.response.status:', error.response.status)
                    console.error('[Catalogue] error.response.data:', error.response.data)
                }
                this.catalogues = []
                this.filteredCatalogues = []
                this.dialog = {
                    visible: true,
                    title: 'Load Failed',
                    message: 'Failed to load catalogues: ' + (error.message || 'Unknown error'),
                    isError: true,
                }
            } finally {
                this.loading = false
            }
        },
        /**
         * Map current scope to backend filters for catalogues.
         */
        getScopeFilters() {
            if (this.scope === 'all') {
                return { status: null, archived: 'false', active: true }
            }
            if (this.scope === 'available') {
                return { status: 'available', archived: 'false', active: true }
            }
            if (this.scope === 'pending') {
                return { status: 'pending', archived: 'false', active: true }
            }
            if (this.scope === 'in_progress') {
                return { status: 'in_progress', archived: 'false', active: true }
            }
            if (this.scope === 'cataloged') {
                return { status: 'cataloged', archived: 'false', active: true }
            }
            if (this.scope === 'ready_for_labeling') {
                return { status: 'ready_for_labeling', archived: 'false', active: true }
            }
            if (this.scope === 'archived') {
                return { archived: 'true' }
            }
            return {}
        },
        applyFilters() {
            let filtered = this.catalogues.slice()

            // Search by ID
            if (this.filters.search) {
                const q = this.filters.search.toLowerCase()
                filtered = filtered.filter(cat =>
                    (cat.id && cat.id.toString().toLowerCase().includes(q)) ||
                    (cat.title && cat.title.toLowerCase().includes(q))
                )
            }

            // Filter by Status
            if (this.filters.status && this.filters.status.length > 0) {
                filtered = filtered.filter(cat =>
                    this.filters.status.includes(cat.cataloging_status)
                )
            }

            // Filter by Branch
            filtered = filterByBranchIds(filtered, this.filters.branch, (cat) => cat.branch_id)

            // Filter by Date Added Range
            if (this.filters.dateAddedFrom) {
                filtered = filtered.filter(cat =>
                    cat.created_at && cat.created_at.substring(0, 10) >= this.filters.dateAddedFrom
                )
            }

            if (this.filters.dateAddedTo) {
                filtered = filtered.filter(cat =>
                    cat.created_at && cat.created_at.substring(0, 10) <= this.filters.dateAddedTo
                )
            }

            this.filteredCatalogues = filtered
        },
        applySearch() {
            const q = this.search && this.search.toLowerCase()
            if (!q) {
                this.filteredCatalogues = this.catalogues.slice()
                return
            }
            this.filteredCatalogues = this.catalogues.filter(cat =>
                Object.values(cat).join(' ').toLowerCase().includes(q)
            )
        },
        onSearch() {
            this.applySearch()
        },
        viewCatalogue(catalogue) {
            if (!catalogue || !catalogue.id) {
                console.warn('viewCatalogue called without valid catalogue:', catalogue)
                return
            }
            try {
                this.$router.push({ name: 'view-catalogue', params: { id: catalogue.id } })
            } catch (error) {
                console.error('Failed to navigate:', error)
            }
        },
        editCatalogue(catalogue) {
            if (!catalogue || !catalogue.id) {
                console.warn('editCatalogue called without valid catalogue:', catalogue)
                return
            }
            try {
                this.$router.push({ name: 'edit-catalogue', params: { id: catalogue.id } })
            } catch (error) {
                console.error('Failed to navigate:', error)
            }
        },
        canEditCatalogue(catalogue) {
            try {
                const session = getSession()
                const role = session && session.role ? String(session.role).toLowerCase() : ''

                // Super admin can edit all records
                if (role === 'super_admin') return true

                // Admins should not be allowed to edit catalogues via UI
                if (role === 'admin') return false

                // Branch admins can edit only catalogues belonging to their branch
                if (role === 'branch_admin') {
                    const sessionBranch = session.branch_id != null ? Number(session.branch_id) : session.branch_id
                    return sessionBranch != null && Number(catalogue.branch_id) === Number(sessionBranch)
                }
            } catch (e) {
                // ignore and fall back to permission check
            }

            // Default to existing permission check
            return this.canEdit
        },
        async printQrCodes(catalogue) {
            if (!catalogue || !catalogue.id) {
                console.warn('printQrCodes called without valid catalogue:', catalogue)
                return
            }
            try {
                // First try fetching the catalogue directly (API typically returns nested `books`).
                let catalogueResp = null
                try {
                    catalogueResp = await getCatalogue(catalogue.id)
                } catch (err) {
                    console.warn('[Catalogue] getCatalogue failed, will fallback to listBooks:', err && err.message)
                }

                let catalogueBooks = []
                if (catalogueResp && Array.isArray(catalogueResp.books) && catalogueResp.books.length > 0) {
                    catalogueBooks = catalogueResp.books
                } else {
                    // Fallback: fetch all books and match by id (handles APIs that don't nest books)
                    const allBooks = await listBooks({ forceRefresh: true });
                    console.log('[Catalogue] printQrCodes - fetched books (fallback):', allBooks.length, { sample: allBooks.slice(0, 3) })
                    catalogueBooks = allBooks.filter(book => {
                        const bookCatalogueId = (book && (book.catalogue_id ?? (book.catalogue && book.catalogue.id)));
                        return String(bookCatalogueId) === String(catalogue.id);
                    })
                }

                console.log('[Catalogue] printQrCodes - catalogue id:', catalogue.id, 'matched books:', catalogueBooks.length)

                if (!catalogueBooks || catalogueBooks.length === 0) {
                    this.dialog = {
                        visible: true,
                        title: 'No Books Found',
                        message: 'No books found for this catalogue.',
                        isError: true,
                    }
                    return;
                }

                // Print all QR codes for this catalogue
                printQrCodes(catalogueBooks, catalogue.title);
            } catch (error) {
                console.error('Failed to print QR codes:', error)
                this.dialog = {
                    visible: true,
                    title: 'Print Failed',
                    message: 'Error printing QR codes: ' + (error.message || 'Unknown error'),
                    isError: true,
                }
            }
        },
        async archiveCatalogue(catalogue) {
            if (!catalogue || !catalogue.id) return

            const confirmed = window.confirm(`Archive catalogue "${catalogue.title}"?`)
            if (!confirmed) return

            try {
                await archiveCatalogue(catalogue.id)
                await this.loadItems(this.tableOptions)
            } catch (error) {
                console.error('Failed to archive:', error)
                this.dialog = {
                    visible: true,
                    title: 'Archive Failed',
                    message: 'Error archiving catalogue: ' + (error.message || 'Unknown error'),
                    isError: true,
                }
            }
        },
        async restoreCatalogue(catalogue) {
            if (!catalogue || !catalogue.id) return

            const confirmed = window.confirm(`Restore catalogue "${catalogue.title}"?`)
            if (!confirmed) return

            try {
                await restoreCatalogue(catalogue.id)
                await this.loadItems(this.tableOptions)
            } catch (error) {
                console.error('Failed to restore:', error)
                this.dialog = {
                    visible: true,
                    title: 'Restore Failed',
                    message: 'Error restoring catalogue: ' + (error.message || 'Unknown error'),
                    isError: true,
                }
            }
        },
        createNew() {
            if (!canCheck(ACTIONS.CREATE)) {
                this.dialog = {
                    visible: true,
                    title: 'Permission Denied',
                    message: 'You do not have permission to create catalogues.',
                    isError: true,
                }
                return
            }
            this.$router.push({ name: 'create-catalogue' })
        },
        onDownloadCsv() {
            exportAsCsv(this.filteredCatalogues, this.catalogueHeaders, 'catalogues.csv')
        },
        onDownloadJson() {
            exportAsJson(this.filteredCatalogues, 'catalogues.json')
        },
        formatStatus(status) {
            return (status || '').toString().replace(/_/g, ' ').toUpperCase()
        },
        getStatusColor(status) {
            const colorMap = {
                'pending': 'info',
                'in_progress': 'warning',
                'cataloged': 'primary',
                'ready_for_labeling': 'warning',
                'available': 'success',
                'on_hold': 'secondary',
                'archived': 'error',
            }
            return colorMap[status] || 'default'
        },
        showDialog(title, message, isError = false) {
            this.dialog = { visible: true, title, message, isError }
        },
    },
}
</script>
