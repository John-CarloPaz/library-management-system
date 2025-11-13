<template>
    <v-container fluid>
        <v-row>
            <v-col cols="12">
                <AppBar title="Manage Books">
                    <template #search-actions>
                        <div>
                            <v-text-field density="compact" v-model="search" label="Search" variant="solo-filled"
                                hide-details="auto" @input="onSearch" style="max-width:360px;" />

                        </div>
                    </template>

                    <template #button-actions v-if="canCreate">
                        <v-btn prepend-icon="fa-plus" variant="tonal" @click="addBook">Add Book</v-btn>
                    </template>
                </AppBar>

                <!-- Reusable table component -->
                <Table :headers="bookHeaders" :items="books" :loading="loading" item-key="bookCode">
                    <template #actions="{ item }">
                        <v-btn icon="fa-eye" size="x-small" variant="plain" @click.stop="viewBook(item)"></v-btn>
                        <v-btn v-if="canEdit" icon="fa-pencil" size="x-small" variant="plain"
                            @click.stop="editBook(item)"></v-btn>
                        <v-btn v-if="canArchive" icon="fa-box-archive" size="x-small" variant="plain"
                            @click.stop="archiveBook(item)"></v-btn>
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
    </v-container>
</template>

<script>
import Table from '../components/Table.vue';
import AppBar from '../components/AppBar.vue';
import booksData from '../data/books.test.json';
import { exportAsCsv, exportAsJson, exportAsXml } from '@/services/export'
import { ACTIONS, can as canCheck, requirePermission } from '@/services/permission';

export default {
    name: 'ManageBooks',
    components: { Table, AppBar },
    data() {
        return {
            loading: false,
            search: '',
            books: booksData.slice(),
            bookHeaders: [
                { text: 'ID', value: 'bookCode' },
                { text: 'Title', value: 'title' },
                { text: 'Author', value: 'author' },
                { text: 'Year', value: 'yearOfProduction' },
                { text: 'Edition', value: 'edition' },
                { text: 'Actions', value: 'actions', sortable: false },
            ],
            canArchive: canCheck(ACTIONS.ARCHIVE),
            canEdit: canCheck(ACTIONS.EDIT),
            canCreate: canCheck(ACTIONS.CREATE),
        };
    },
    mounted() {
        // update permission flags when session changes in other tabs
        window.addEventListener('storage', this.updatePermissions)
    },
    beforeUnmount() {
        window.removeEventListener('storage', this.updatePermissions)
    },
    methods: {
        updatePermissions() {
            this.canArchive = canCheck(ACTIONS.ARCHIVE)
            this.canEdit = canCheck(ACTIONS.EDIT)
            this.canCreate = canCheck(ACTIONS.CREATE)
        },
        viewBook(item) {
            // navigate to view details for this book
            if (!item || !item.bookCode) {
                console.warn('viewBook called without valid item:', item);
                return;
            }
            this.$router.push({ name: 'view-book', params: { bookCode: item.bookCode } });
        },
        editBook(item) {
            // navigate to edit view for this book
            if (!item || !item.bookCode) {
                console.warn('editBook called without valid item:', item);
                return;
            }
            if (!canCheck(ACTIONS.EDIT)) {
                try { window.alert('You do not have permission to create this item.'); } catch (e) { }
                return;
            }
            this.$router.push({ name: 'edit-book', params: { bookCode: item.bookCode } });
        },
        addBook() {
            // navigate to create view for adding a new book
            this.$router.push({ name: 'create-book' });

            if (!canCheck(ACTIONS.CREATE)) {
                try { window.alert('You do not have permission to create this item.'); } catch (e) { }
                return;
            }
        },
        // Archive action: check permission before performing the action
        archiveBook(item) {
            if (!item || !item.bookCode) {
                console.warn('archiveBook called without valid item:', item);
                return;
            }
            // double-check permission at runtime
            if (!canCheck(ACTIONS.ARCHIVE)) {
                try { window.alert('You do not have permission to archive this item.'); } catch (e) { }
                return;
            }
            // perform archive (for demo we remove it from the list)
            this.books = this.books.filter(b => b.bookCode !== item.bookCode);
        },
        // Download handlers using export service
        onDownloadCsv() {
            // export visible/filtered books using header definitions
            exportAsCsv(this.books, this.bookHeaders, 'books.csv');
        },
        onDownloadJson() {
            exportAsJson(this.books, 'books.json');
        },
        onDownloadXml() {
            exportAsXml(this.books, this.bookHeaders, 'books.xml', { rootName: 'books', itemName: 'book' });
        },
        onSearch() {
            const q = this.search && this.search.toLowerCase();
            if (!q) {
                this.books = booksData.slice();
                return;
            }
            this.books = booksData.filter(b =>
                Object.values(b).join(' ').toLowerCase().includes(q)
            );
        },
        printQr(item) {
            if (!item) {
                console.warn('printQr called without item');
                return;
            }

            const dataUrl = this.generateQRCode(item);

            // Open a print-friendly window with the QR image and trigger print
            const printWindow = window.open('', '_blank', 'width=420,height=640');
            if (!printWindow) {
                alert('Popup blocked. Please allow popups to print the QR code.');
                return;
            }

            const html = `<!doctype html><html><head><title>Print QR</title><meta charset="utf-8"><style>html,body{height:100%;margin:0}body{display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif}img{max-width:90%;height:auto;border:0}</style></head><body><div><img src="${dataUrl}" alt="QR"/><div style="text-align:center;margin-top:8px;font-size:14px;color:#333">${item.bookCode || ''}</div></div><script>window.onload=function(){setTimeout(()=>{window.print();},200);};${'</scr' + 'ipt>'}</body></html>`;
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
        },
        generateQRCode(item) {
            // Prefer an existing QR URL/data provided on the item by your API.
            // Common property names: qrUrl, qrDataUrl, qrImage. Adjust if your API uses a
            // different field. For now, if none exist we fall back to a simple SVG placeholder.
            let dataUrl = item.qrUrl || item.qrDataUrl || item.qrImage || null;

            if (!dataUrl) {
                // Fallback: simple SVG placeholder with the id/text
                const label = String(item.bookCode || item.title || 'N/A');
                const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><rect width='100%' height='100%' fill='#fff'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='18' fill='#333'>QR ${label}</text></svg>`;
                dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
            }
            return dataUrl;
        },
    },
};
</script>

<style scoped>
.mb-4 {
    margin-bottom: 1rem;
}
</style>
