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
                <Table :headers="branchHeaders" :items="branches" :loading="loading" item-key="id">
                    <template #actions="{ item }">
                        <v-btn icon="fa-eye" size="x-small" variant="plain" @click.stop="viewBranch(item)"></v-btn>
                        <v-btn icon="fa-pencil" size="x-small" variant="plain" @click.stop="editBranch(item)"></v-btn>
                    </template>
                </Table>
            </v-col>
        </v-row>
    </v-container>


</template>

<script>
import AppBar from '../components/AppBar.vue'
import Table from '@/components/Table.vue';
import branchesData from '../data/branches.json';
export default {
    name: 'branch-management',
    components: {
        AppBar,
        Table,
    },
    data() {
        return {
            loading: false,
            search: '',
            branches: branchesData.slice(),
            branchHeaders: [
                { text: 'Branch ID', value: 'id' },
                { text: 'Branch Name', value: 'name' },
                { text: 'Details', value: 'details' },
                { text: 'Address', value: 'address' },
                { text: 'Manger', value: 'manager' },
                { text: 'Public IP', value: 'public_ip' },
                { text: 'Actions', value: 'actions', sortable: false },
            ],
        };
    },
    methods: {
        onSearch() {
            const q = this.search && this.search.toLowerCase();
            if (!q) {
                this.branches = branchesData.slice();
                return;
            }
            this.branches = branchesData.filter(b =>
                Object.values(b).join(' ').toLowerCase().includes(q)
            );
        },
    }
}
</script>