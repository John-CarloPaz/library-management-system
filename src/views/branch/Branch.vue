<template>
    <AppBar title="Branch Management">
        <template #search-actions>
            <div>
                <v-text-field density="compact" v-model="search" label="Search" variant="solo-filled"
                    hide-details="auto" @input="onSearch" style="max-width:360px;" />
            </div>
        </template>

        <template #button-actions v-if="canCreate">
            <v-btn prepend-icon="fa-plus" variant="tonal" @click="createNew">Create Branch</v-btn>
        </template>
    </AppBar>

    <v-container fluid>
        <v-row>
            <v-col cols="12" class="mt-8">
                <ScopeTab
                    v-model="scope"
                    :active-count="scopeCounts.active"
                    :archived-count="scopeCounts.archived"
                />
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12">
                <Table
                    :headers="branchHeaders"
                    :items="filteredBranches"
                    :items-length="totalBranches"
                    :loading="loading"
                    v-model:items-per-page="itemsPerPage"
                    item-key="id"
                    @update:options="loadItems"
                >
                    <template #actions="{ item }">
                        <v-btn icon="fa-eye" size="x-small" variant="plain" @click.stop="viewBranch(item)" title="View"></v-btn>
                        <v-btn icon="fa-pencil" size="x-small" variant="plain" @click.stop="editBranch(item)" title="Edit" v-if="scope === 'active'"></v-btn>
                        <v-btn v-if="scope === 'active'" icon="fa-box-archive" size="x-small" variant="plain" @click.stop="archiveBranch(item)" title="Archive"></v-btn>
                        <v-btn v-if="scope === 'archived'" icon="fa-rotate-left" size="x-small" variant="plain" @click.stop="restoreBranch(item)" title="Restore"></v-btn>
                    </template>

                    <!-- Main branch indicator -->
                    <template #cell-is_main_branch="{ item }">
                        <v-chip v-if="item.is_main_branch" color="primary" size="small" variant="elevated">
                            Main Branch
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
</template>

<script>
import AppBar from '@/components/AppBar.vue'
import Table from '@/components/Table.vue'
import ScopeTab from '@/components/ScopeTab.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { fetchBranchesPage, listActiveBranches, listArchivedBranches, archiveBranch, restoreBranch } from '@/services/branch'
import { exportAsCsv, exportAsJson } from '@/services/export'
import { ACTIONS, can as canCheck } from '@/services/permission'

export default {
    name: 'branch-management',
    components: { AppBar, Table, ScopeTab, ErrorDialog },
    data() {
        return {
            loading: false,
            search: '',
            scope: 'active',
            scopeCounts: {
                active: null,
                archived: null,
            },
            branches: [],
            filteredBranches: [],
            totalBranches: 0,
            itemsPerPage: 10,
            tableOptions: {
                page: 1,
                itemsPerPage: 10,
                sortBy: [],
            },
            canCreate: canCheck(ACTIONS.CREATE),
            pollingInterval: null,
            loadBranchesTimeout: null,
            isRealtimeUpdate: false,
            handleRealtimeUpdate: null,
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: false,
            },
            branchHeaders: [
                { text: 'ID', value: 'id' },
                { text: 'Name', value: 'name' },
                { text: 'Address', value: 'address' },
                { text: 'Main Branch', value: 'is_main_branch' },
                { text: 'Public IP', value: 'public_ip' },
                { text: 'Actions', value: 'actions', sortable: false },
            ],
        }
    },
    watch: {
        scope() {
            this.loadItems({
                page: 1,
                itemsPerPage: this.itemsPerPage,
                sortBy: this.tableOptions.sortBy || [],
            })
        }
    },
    mounted() {
        this.loadItems({
            page: 1,
            itemsPerPage: this.itemsPerPage,
            sortBy: [],
        })
        
        this.handleRealtimeUpdate = (event) => {
            if (event.detail.action === 'create' || event.detail.action === 'update' || 
                event.detail.action === 'archive' || event.detail.action === 'restore') {
                
                if (this.loadBranchesTimeout) {
                    clearTimeout(this.loadBranchesTimeout)
                }
                
                this.isRealtimeUpdate = true
                this.loadBranchesTimeout = setTimeout(async () => {
                    await this.loadItems(this.tableOptions)
                    this.isRealtimeUpdate = false
                }, 500)
            }
        }
        
        window.addEventListener('action:branch', this.handleRealtimeUpdate)
    },
    beforeUnmount() {
        if (this.handleRealtimeUpdate) {
            window.removeEventListener('action:branch', this.handleRealtimeUpdate)
        }
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval)
        }
        if (this.loadBranchesTimeout) {
            clearTimeout(this.loadBranchesTimeout)
        }
    },
    methods: {
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
                const filters = this.scope === 'active'
                    ? { active: true, archived: 'false' }
                    : { archived: 'true' }

                const { items, total } = await fetchBranchesPage({
                    ...filters,
                    page: this.tableOptions.page,
                    itemsPerPage: this.tableOptions.itemsPerPage,
                })

                this.branches = Array.isArray(items) ? items : []
                this.totalBranches = typeof total === 'number' ? total : this.branches.length

                if (this.scope === 'active') {
                    this.scopeCounts.active = this.totalBranches
                } else {
                    this.scopeCounts.archived = this.totalBranches
                }

                this.applySearch()
            } catch (error) {
                console.error(`Failed to load ${this.scope} branches:`, error)
                this.branches = []
                this.filteredBranches = []
                this.dialog = {
                    visible: true,
                    title: 'Load Failed',
                    message: 'Failed to load branches: ' + (error.message || 'Unknown error'),
                    isError: true,
                }
            } finally {
                this.loading = false
            }
        },
        applySearch() {
            const q = this.search && this.search.toLowerCase()
            if (!q) {
                this.filteredBranches = this.branches.slice()
                return
            }
            this.filteredBranches = this.branches.filter(branch =>
                Object.values(branch).join(' ').toLowerCase().includes(q)
            )
        },
        onSearch() {
            this.applySearch()
        },
        viewBranch(branch) {
            if (!branch || !branch.id) {
                console.warn('viewBranch called without valid branch:', branch)
                return
            }
            try {
                this.$router.push({ name: 'view-branch', params: { id: branch.id } })
            } catch (error) {
                console.error('Failed to navigate:', error)
            }
        },
        editBranch(branch) {
            if (!branch || !branch.id) {
                console.warn('editBranch called without valid branch:', branch)
                return
            }
            try {
                this.$router.push({ name: 'edit-branch', params: { id: branch.id } })
            } catch (error) {
                console.error('Failed to navigate:', error)
            }
        },
        createNew() {
            this.$router.push({ name: 'create-branch' })
        },
        async archiveBranch(branch) {
            if (!window.confirm('Are you sure you want to archive this branch?')) {
                return
            }
            try {
                await archiveBranch(branch.id)
                await this.loadBranches()
            } catch (error) {
                this.showDialog('Error', `Failed to archive branch: ${error.message}`, true)
            }
        },
        async restoreBranch(branch) {
            try {
                await restoreBranch(branch.id)
                await this.loadBranches()
            } catch (error) {
                this.showDialog('Error', `Failed to restore branch: ${error.message}`, true)
            }
        },
        onDownloadCsv() {
            exportAsCsv(this.filteredBranches, 'branches.csv')
        },
        onDownloadJson() {
            exportAsJson(this.filteredBranches, 'branches.json')
        },
        showDialog(title, message, isError = false) {
            this.dialog = { visible: true, title, message, isError }
        },
    },
}
</script>
