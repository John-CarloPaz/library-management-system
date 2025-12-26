<template>
    <v-container>
        <v-row>
            <v-col cols="12">
                <AppBar :title="`Book Details`">
                    <template #title-actions>
                        <v-btn text @click="goBack">Back</v-btn>
                    </template>
                </AppBar>

                <!-- Book Details Table -->
                <InfoTable 
                    title="Book Information"
                    :fields="bookFieldsData"
                />

                <!-- Audit Trail Section -->
                <InfoTable 
                    title="Audit Trail"
                    :fields="auditFieldsData"
                />

                <!-- Borrower Details -->
                <p class="font-weight-bold mb-2 mt-4">Borrower Details</p>
                <Table :headers="borrowerHeaders" :items="borrowers" :loading="loading" item-key="id">
                    <template #actions="{ item }">
                        <v-chip variant="elevated" color="warning" v-if="item.status == 'active'"><p class="text-capitalize">{{ item.status }}</p></v-chip>
                        <v-chip variant="elevated" color="success" v-if="item.status == 'returned'"><p class="text-capitalize">{{ item.status }}</p></v-chip>
                    </template>
                </Table>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import AppBar from '@/components/AppBar.vue';
import Table from '@/components/Table.vue';
import InfoTable from '@/components/InfoTable.vue';
import { getBook } from '@/services/book';
import { subscribeToActions, waitForEchoConnection } from '@/services/realtime';

export default {
    name: 'ViewBookDetails',
    components: { AppBar, Table, InfoTable },
    props: {
        bookCode: {
            type: String,
            required: true,
        },
    },
    data() {
        return {
            book: {},
            loading: false,
            // Borrowers will be loaded from the backend in a future update.
            // For now, start with an empty list instead of hardcoded test data.
            borrowers: [],
            borrowerHeaders: [
                { text: 'ID', value: 'studentId' },
                { text: 'Name', value: 'name' },
                { text: 'Email', value: 'email' },
                { text: 'Actions', value: 'actions', sortable: false },
            ],
        };
    },
    async created() {
        await this.loadBook();

        // Real-time listener for book updates
        waitForEchoConnection().then(() => {
            subscribeToActions((data) => {
                if (data.resource_type === 'book' && String(data.resource_id) === String(this.bookCode)) {
                    console.log(`🔄 Real-time update detected for book ${this.bookCode}`)
                    this.loadBook()
                }
            })
        })
    },
    computed: {
        bookFieldsData() {
            return [
                { label: 'Copy Number', value: this.book.copy_number },
                { label: 'Reference Number', value: this.book.reference_number },
                { label: 'Title', value: this.book.catalogue?.title || this.book.title },
                { label: 'Author', value: this.book.catalogue?.author || this.book.author },
                { label: 'Publisher', value: this.book.catalogue?.publisher || this.book.publisher },
                { label: 'Year', value: this.book.catalogue?.year_of_publication || this.book.year_of_publication },
                { label: 'Edition', value: this.book.catalogue?.edition || this.book.edition },
                { label: 'ISBN', value: this.book.catalogue?.isbn || this.book.isbn },
                { label: 'Call Number', value: this.book.catalogue?.call_number || this.book.call_number },
                { label: 'Branch', value: this.book.branch?.name || `Branch ${this.book.branch_id}` },
                { label: 'Status', value: this.book.catalogue?.cataloging_status || this.book.cataloging_status },
                { 
                    label: 'QR Code', 
                    value: this.book.qr_code ? this.getQrCodeFilename() : 'N/A',
                    isLink: !!this.book.qr_code,
                    onClick: this.openQrCodeInNewTab
                },
            ];
        },
        auditFieldsData() {
            return [
                { label: 'Created By', value: this.book.created_by },
                { label: 'Created At', value: this.book.created_at },
                { label: 'Updated By', value: this.book.updated_by },
                { label: 'Updated At', value: this.book.updated_at },
            ];
        },
    },
    methods: {
        async loadBook() {
            this.loading = true;
            try {
                this.book = await getBook(this.bookCode, true);
                if (!this.book || !this.book.id) {
                    console.warn('Book not found:', this.bookCode);
                    this.$router.replace({ name: 'manage-books' });
                }
            } catch (error) {
                console.error('Error loading book:', error.message);
                this.$router.replace({ name: 'manage-books' });
            } finally {
                this.loading = false;
            }
        },
        goBack() {
            this.$router.back();
        },
        getQrCodeFilename() {
            if (!this.book.qr_code) return '';
            // Extract filename from path
            const parts = this.book.qr_code.split('/');
            return parts[parts.length - 1];
        },
        getQrCodeUrl() {
            if (!this.book.qr_code) return '';
            const origin = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
            const baseUrl = `${origin}/public/storage/`;
            let path = this.book.qr_code;
            
            // Log the raw path from backend
            console.log('QR Code raw path from backend:', path);
            
            // Remove /api/ from anywhere in the path
            path = path.replace('/api/', '');
            
            // Log the processed path
            const finalUrl = baseUrl + path;
            console.log('QR Code final URL:', finalUrl);
            
            return finalUrl;
        },
        openQrCodeInNewTab() {
            if (!this.book.qr_code) return;
            const url = this.getQrCodeUrl();
            window.open(url, '_blank');
        },
        downloadQrCode() {
            if (!this.book.qr_code) return;
            const url = this.getQrCodeUrl();
            const link = document.createElement('a');
            link.href = url;
            link.download = `qr-code-${this.book.reference_number}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
    },
};
</script>

