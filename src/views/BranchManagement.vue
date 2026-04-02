<template>
    <AppBar title="Branch Management">
        <template #search-actions>
            <div>
                <v-text-field density="compact" v-model="search" label="Search" variant="solo-filled"
                    hide-details="auto" @input="onSearch" style="max-width:360px;" />
            </div>
        </template>
    </AppBar>

    <v-container>
        <v-row>
            <v-col cols="12" class="mt-8">
                <ScopeTab
                    v-model="scope"
                    :scopes="branchScopes"
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
                        <v-btn icon="fa-eye" size="x-small" variant="plain" @click.stop="viewBranch(item)"></v-btn>
                        <v-btn icon="fa-pencil" size="x-small" variant="plain" @click.stop="editBranch(item)"></v-btn>
                        <v-btn
                            v-if="scope === 'active'"
                            icon="fa-box-archive"
                            size="x-small"
                            variant="plain"
                            @click.stop="archiveBranch(item)"
                            title="Archive"
                        ></v-btn>
                        <v-btn
                            v-if="scope === 'archived'"
                            icon="fa-rotate-left"
                            size="x-small"
                            variant="plain"
                            @click.stop="restoreBranch(item)"
                            title="Restore"
                        ></v-btn>
                    </template>
                </Table>
            </v-col>
        </v-row>
    </v-container>

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
import ScopeTab from '@/components/ScopeTab.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { fetchBranchesPage, archiveBranch as archiveBranchApi, restoreBranch as restoreBranchApi } from '@/services/branch'
export default {
    name: 'branch-management',
    components: {
        AppBar,
        Table,
        ScopeTab,
        ErrorDialog,
    },
    data() {
        return {
            loading: false,
            search: '',
            scope: 'active',
            branchScopes: [
                { value: 'active', label: 'Active' },
                { value: 'archived', label: 'Archived' },
            ],
            branches: [],
            filteredBranches: [],
            totalBranches: 0,
            itemsPerPage: 10,
            tableOptions: {
                page: 1,
                itemsPerPage: 10,
                sortBy: [],
            },
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: false,
            },
            branchHeaders: [
                { text: 'Branch ID', value: 'id' },
                { text: 'Branch Name', value: 'name' },
                { text: 'Details', value: 'details' },
                { text: 'Address', value: 'address' },
                { text: 'Manger', value: 'manager' },
                { text: 'Public IP', value: 'public_ip' },
                { text: 'Public IPv6', value: 'public_ipv6' },
                { text: 'Actions', value: 'actions', sortable: false },
            ],
        };
    },
    watch: {
        scope() {
            this.loadItems({
                page: 1,
                itemsPerPage: this.itemsPerPage,
                sortBy: this.tableOptions.sortBy || [],
            })
        },
    },
    mounted() {
        this.loadItems({
            page: 1,
            itemsPerPage: this.itemsPerPage,
            sortBy: [],
        });
    },
    methods: {
        async loadItems({ page, itemsPerPage, sortBy }) {
            this.loading = true

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

                this.applySearch()
            } catch (error) {
                console.error('Failed to load branches:', error)
                this.branches = []
                this.filteredBranches = []
                this.showDialog('Load Failed', 'Failed to load branches: ' + (error.message || 'Unknown error'), true)
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
            this.filteredBranches = this.branches.filter(b =>
                Object.values(b).join(' ').toLowerCase().includes(q)
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
        async archiveBranch(branch) {
            if (!branch || !branch.id) {
                console.warn('archiveBranch called without valid branch:', branch)
                return
            }

            if (!window.confirm('Are you sure you want to archive this branch?')) {
                return
            }

            try {
                await archiveBranchApi(branch.id)
                await this.loadItems(this.tableOptions)
            } catch (error) {
                console.error('Failed to archive branch:', error)
                this.showDialog('Archive Error', `Failed to archive branch: ${error.message || 'Unknown error'}`, true)
            }
        },
        async restoreBranch(branch) {
            if (!branch || !branch.id) {
                console.warn('restoreBranch called without valid branch:', branch)
                return
            }
            try {
                await restoreBranchApi(branch.id)
                await this.loadItems(this.tableOptions)
            } catch (error) {
                console.error('Failed to restore branch:', error)
                this.showDialog('Restore Error', `Failed to restore branch: ${error.message || 'Unknown error'}`, true)
            }
        },
        showDialog(title, message, isError = false) {
            this.dialog = { visible: true, title, message, isError }
        },
    }
}
</script>