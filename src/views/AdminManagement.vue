<template>
    <AppBar title="Admin Management">
        <template #search-actions>
            <div>
                <v-text-field density="compact" v-model="search" label="Search" variant="solo-filled"
                    hide-details="auto" @input="onSearch" style="max-width:360px;" />
            </div>
        </template>

        <template #button-actions v-if="canCreate">
            <v-btn prepend-icon="fa-plus" variant="tonal" @click="addAdmin">Create Admin</v-btn>
        </template>
    </AppBar>

    <v-container fluid>
        <v-row>
            <v-col cols="12" class="mt-8">
                <Table :headers="adminHeaders" :items="admins" :loading="loading" item-key="employee_id">
                    <template #actions="{ item }">
                        <v-btn icon="fa-eye" size="x-small" variant="plain" @click.stop="viewAdmin(item)"></v-btn>
                        <v-btn icon="fa-pencil" size="x-small" variant="plain" @click.stop="editAdmin(item)"></v-btn>
                        <v-btn icon="fa-box-archive" size="x-small" variant="plain"></v-btn>
                    </template>

                    <!-- Custom renderer for role column - uses Table's per-column slot bridge -->
                    <template #cell-role="{ item }">
                        <v-chip variant="elevated" color="purple" v-if="item.role === 'super_admin'" size="small">
                            <p class="text-capitalize">{{ prettyRole(item.role) }}</p>
                        </v-chip>
                        <v-chip variant="elevated" color="warning" v-else-if="item.role === 'branch_admin'"
                            size="small">
                            <p class="text-capitalize">{{ prettyRole(item.role) }}</p>
                        </v-chip>
                        <v-chip variant="elevated" color="info" size="small" v-else>
                            <p class="text-capitalize">{{ prettyRole(item.role) }}</p>
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


</template>

<script>
import AppBar from '../components/AppBar.vue'
import Table from '@/components/Table.vue';
import adminsData from '../data/admins.json';
import { exportAsCsv, exportAsJson, exportAsXml } from '@/services/export'
import { ACTIONS, can as canCheck, requirePermission } from '@/services/permission';

export default {
    name: 'admin-management',
    data() {
        return {
            loading: false,
            search: '',
            admins: adminsData,
            adminHeaders: [
                { text: 'ID', value: 'employee_id' },
                { text: 'Name', value: 'username' },
                { text: 'Email', value: 'email' },
                { text: 'Role', value: 'role' },
                { text: 'Actions', value: 'actions', sortable: false },
            ],
            canCreate: canCheck(ACTIONS.CREATE),
        }
    },
    components: {
        AppBar,
        Table,
    },
    methods: {
        onDownloadCsv() {
            // export visible/filtered books using header definitions
            exportAsCsv(this.admins, this.adminHeaders, 'admins.csv');
        },
        onDownloadJson() {
            exportAsJson(this.admins, 'admins.json');
        },
        onDownloadXml() {
            exportAsXml(this.admins, this.adminHeaders, 'books.xml', { rootName: 'admins', itemName: 'admin' });
        },
        onSearch() {
            const q = this.search && this.search.toLowerCase();
            if (!q) {
                this.admins = adminsData.slice();
                return;
            }
            this.admins = adminsData.filter(b =>
                Object.values(b).join(' ').toLowerCase().includes(q)
            );
        },
        viewAdmin(admin) {
            // Implement view admin functionality here
            console.log('Viewing admin:', admin);
        },
        editAdmin(admin) {
            // Implement edit admin functionality here
            console.log('Editing admin:', admin);
        },
        prettyRole(role) {
            return (role || '').toString().replace(/_/g, ' ')
        },
        addAdmin() {
            // navigate to create view for adding a new book
            this.$router.push({ name: 'create-admin' });

            if (!canCheck(ACTIONS.CREATE)) {
                try { window.alert('You do not have permission to create this item.'); } catch (e) { }
                return;
            }
        },
    },
}
</script>