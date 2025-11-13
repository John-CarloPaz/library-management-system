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

                    <!-- Custom cell slot for status column. Other views are unaffected because
                         they won't provide this slot. -->
                    <template #cell-status="{ item }">
                        <v-chip variant="elevated" color="warning" size="small" v-if="item.status === 'Borrowed'">
                            <p class="text-capitalize">{{ item.status }}</p>
                        </v-chip>
                        <v-chip variant="elevated" color="success" size="small" v-else-if="item.status === 'Returned'">
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



</template>

<script>
import AppBar from '../components/AppBar.vue'
import Table from '../components/Table.vue'
import recordsData from '../data/records.test.json'
import { exportAsCsv, exportAsJson, exportAsXml } from '@/services/export'

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
        onDownloadCsv() {
            // export visible/filtered books using header definitions
            exportAsCsv(this.records, this.recordsHeaders, 'records.csv');
        },
        onDownloadJson() {
            exportAsJson(this.records, 'records.json');
        },
        onDownloadXml() {
            exportAsXml(this.records, this.recordsHeaders, 'records.xml', { rootName: 'records', itemName: 'record' });
        },
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