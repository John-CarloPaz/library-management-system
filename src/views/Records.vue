<template>
    <v-container>
        <v-row>
            <v-col class="mt-8">
                <AppBar title="Records">
                    <template #search-actions>
                        <div>
                            <v-text-field density="compact" v-model="search" label="Search" variant="solo-filled"
                                hide-details="auto" @input="onSearch" style="max-width:360px;" />

                        </div>
                    </template>
                </AppBar>
                <Table :headers="recordsHeaders" :items="records" :loading="loading" item-key="bookCode">
                    <template #actions="{ item }">
                        <v-btn icon="fa-eye" size="x-small" variant="plain" @click.stop="viewBook(item)"></v-btn>
                    </template>
                </Table>
            </v-col>
        </v-row>
    </v-container>



</template>

<script>
import AppBar from '../components/AppBar.vue'
import Table from '../components/Table.vue'
import recordsData from '../data/records.test.json'
export default {
    name: 'Settings',
    components: {
        AppBar,
        Table,
    },
    data() {
        return {
            records: recordsData.slice(),
            loading: false,
            recordsHeaders: [
                { text: 'Student ID', value: 'studentId' },
                { text: 'Student Name', value: 'studentName' },
                { text: 'Book Code', value: 'bookCode' },
                { text: 'Book Title', value: 'bookTitle' },
                { text: 'Due Date', value: 'dueDate' },
                { text: 'Date Returned', value: 'dateReturned' },
                { text: 'Date Borrowed', value: 'dateBorrowed' },
                { text: 'Status', value: 'status' },
                { text: 'Actions', value: 'actions', sortable: false }
            ]
        };
    },
    methods: {
        onSearch() {
            const q = this.search && this.search.toLowerCase();
            if (!q) {
                this.records = this.recordsData.slice();
                return;
            }
            this.records = recordsData.filter(b =>
                Object.values(b).join(' ').toLowerCase().includes(q)
            );
        },
    }
};  
</script>