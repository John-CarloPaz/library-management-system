<template>
    <v-container fluid>
        <v-row>
            <v-col cols="12">
                <AppBar :title="`Edit Book Status`">
                    <template #title-actions>
                        <v-btn text @click="goBack">Back</v-btn>
                    </template>
                </AppBar>

                <!-- Status Banner -->
                <StatusBanner 
                    v-if="bannerMessage"
                    :message="bannerMessage"
                    :type="bannerType"
                    @close="bannerMessage = ''"
                />

                <!-- Book Information (Read-only) -->
                <InfoTable 
                    title="Book Information"
                    :fields="bookFieldsData"
                    :elevation="0"
                />

                <!-- Status Edit Form -->
                <v-card class="mt-4 mb-4">
                    <v-card-title>Update Status</v-card-title>
                    <v-card-text>
                        <v-row>
                            <v-col cols="12">
                                <v-select
                                    v-model="form.status"
                                    label="Status"
                                    :items="statusOptions"
                                    item-title="text"
                                    item-value="value"
                                    variant="outlined"
                                    density="comfortable"
                                    required
                                />
                            </v-col>
                        </v-row>

                        <v-row class="mt-4">
                            <v-col cols="auto">
                                <v-btn 
                                    color="primary" 
                                    @click="saveChanges"
                                    :loading="saving"
                                >
                                    Save Changes
                                </v-btn>
                            </v-col>
                            <v-col cols="auto">
                                <v-btn 
                                    variant="outlined"
                                    @click="goBack"
                                >
                                    Cancel
                                </v-btn>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>
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
import AppBar from '@/components/AppBar.vue';
import ErrorDialog from '@/components/ErrorDialog.vue';
import StatusBanner from '@/components/StatusBanner.vue';
import InfoTable from '@/components/InfoTable.vue';
import { getBook, editBookStatus } from '@/services/book';

export default {
    name: 'EditBooks',
    components: { AppBar, StatusBanner, InfoTable, ErrorDialog },
    props: {
        bookCode: {
            type: String,
            required: true,
        },
    },
    data() {
        return {
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: false,
            },
            book: {},
            form: {
                status: '',
            },
            saving: false,
            bannerMessage: '',
            bannerType: 'success',
            statusOptions: [
                { value: 'available', text: 'Available' },
                { value: 'for_archiving', text: 'For Archiving' },
                { value: 'lost', text: 'Lost' },
                { value: 'damaged', text: 'Damaged' },
                { value: 'under_repair', text: 'Under Repair' },
            ],
        };
    },
    async created() {
        await this.loadBook();
    },
    computed: {
        bookFieldsData() {
            return [
                { label: 'Copy Number', value: this.book.copy_number },
                { label: 'Reference Number', value: this.book.reference_number },
                { label: 'Title', value: this.book.title },
                { label: 'Author', value: this.book.author },
                { label: 'Publisher', value: this.book.publisher },
                { label: 'Year', value: this.book.year_of_publication },
                { label: 'Edition', value: this.book.edition },
                { label: 'ISBN', value: this.book.isbn },
                { label: 'Call Number', value: this.book.call_number },
                { label: 'Current Status', value: this.book.cataloging_status },
            ];
        },
    },
    methods: {
        async loadBook() {
            try {
                this.book = await getBook(this.bookCode, true);
                if (!this.book || !this.book.id) {
                    console.warn('Book not found:', this.bookCode);
                    this.$router.replace({ name: 'manage-books' });
                    return;
                }
                // Set initial form values
                this.form.status = this.book.cataloging_status || 'available';
            } catch (error) {
                console.error('Error loading book:', error.message);
                this.bannerMessage = 'Failed to load book details';
                this.bannerType = 'error';
            }
        },
        async saveChanges() {
            // Validate status selection
            if (!this.form.status) {
                this.bannerMessage = 'Please select a status';
                this.bannerType = 'error';
                return;
            }

            this.saving = true;
            try {
                await editBookStatus(this.book.id, this.form.status);
                this.bannerMessage = 'Book status updated successfully!';
                this.bannerType = 'success';
                
                // Redirect to view page with success flag
                setTimeout(() => {
                    this.$router.push({
                        name: 'view-book',
                        params: { bookCode: this.book.id },
                        query: { success: 'true' },
                    });
                }, 1500);
            } catch (error) {
                console.error('Error updating book status:', error.message);
                this.bannerMessage = error.message || 'Failed to update book status';
                this.bannerType = 'error';
            } finally {
                this.saving = false;
            }
        },
        goBack() {
            this.$router.back();
        },
        showDialog(title, message, isError = false) {
            this.dialog = { visible: true, title, message, isError }
        },
    },
};
</script>

<style scoped>
/* Styles are now in InfoTable component */
</style>