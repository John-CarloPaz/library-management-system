<template>
    <AppBar title="Catalogue Details">
        <template #title-actions>
            <v-btn text @click="goBack">Back</v-btn>
            <v-btn color="primary" @click="editCatalogue" :disabled="isLoading">Edit</v-btn>
        </template>
    </AppBar>
    <v-container>
        <StatusBanner 
            v-if="bannerMessage"
            :type="bannerType"
            :message="bannerMessage"
            :duration="5000"
            class="mt-4"
        />

        <v-card elevation="0" class="py-3" v-if="!isLoading">
            <v-card-text>
                <InfoTable 
                    title="Catalogue Information"
                    :fields="catalogueFieldsData"
                />

                <InfoTable 
                    title="Acquisition Details"
                    :fields="acquisitionFieldsData"
                />

                <p class="font-weight-bold mb-2 mt-4" v-if="catalogue.cataloging_status === 'available'">Book Copies</p>
                <Table 
                    v-if="catalogue.cataloging_status === 'available' && catalogue.books && catalogue.books.length > 0"
                    :headers="copyHeaders" 
                    :items="catalogue.books" 
                    item-key="id"
                >
                    <template #actions="{ item }">
                        <v-btn size="x-small" color="primary" icon="fa-qrcode" @click="printSingleQrCode(item)" title="Print QR Code"></v-btn>
                    </template>
                </Table>
                <div v-else-if="catalogue.cataloging_status === 'available'" class="text-center text-grey mt-4">
                    No book copies available
                </div>

                <div class="mt-4" v-if="catalogue.cataloging_status === 'available' && catalogue.books && catalogue.books.length > 0">
                    <v-btn color="primary" prepend-icon="fa-print" @click="printAllQrCodes">
                        Print All QR Codes ({{ catalogue.books.length }} copies)
                    </v-btn>
                </div>
            </v-card-text>
        </v-card>

        <v-card elevation="1" v-if="isLoading" class="py-3">
            <v-card-text>
                <v-progress-linear indeterminate></v-progress-linear>
            </v-card-text>
        </v-card>

        <!-- Error Dialog -->
        <ErrorDialog
            :visible.sync="dialog.visible"
            :title="dialog.title"
            :message="dialog.message"
            :isError="dialog.isError"
            @update:visible="dialog.visible = $event"
        />
    </v-container>
</template>

<script>
import AppBar from '@/components/AppBar.vue'
import Table from '@/components/Table.vue'
import StatusBanner from '@/components/StatusBanner.vue'
import InfoTable from '@/components/InfoTable.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { getCatalogue } from '@/services/catalogue'
import { printQrCodes } from '@/services/qrPrint'
import { subscribeToActions, waitForEchoConnection } from '@/services/realtime'

export default {
    name: 'view-catalogue-details',
    components: { AppBar, Table, StatusBanner, InfoTable, ErrorDialog },
    data() {
        return {
            isLoading: true,
            bannerMessage: '',
            bannerType: 'success',
            catalogueId: null,
            catalogue: null,
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: true,
            },
            copyHeaders: [
                { text: 'Copy #', value: 'copy_number' },
                { text: 'Reference Number', value: 'reference_number' },
                { text: 'Actions', value: 'actions', sortable: false },
            ],
        }
    },
    computed: {
        catalogueFieldsData() {
            if (!this.catalogue) return []

            return [
                { label: 'ID', value: this.catalogue.id },
                { label: 'Title', value: this.catalogue.title },
                { label: 'Author', value: this.catalogue.author },
                { label: 'ISBN', value: this.catalogue.isbn || 'N/A' },
                { label: 'Publisher', value: this.catalogue.publisher || 'N/A' },
                { label: 'Year of Publication', value: this.catalogue.year_of_publication || 'N/A' },
                { label: 'Edition', value: this.catalogue.edition || 'N/A' },
                { label: 'Call Number', value: this.catalogue.call_number || 'N/A' },
                { label: 'Branch', value: this.catalogue.branch ? this.catalogue.branch.name : `Branch ${this.catalogue.branch_id}` },
                { label: 'Status', value: this.formatStatus(this.catalogue.cataloging_status) },
            ]
        },
        acquisitionFieldsData() {
            if (!this.catalogue) return []

            const self = this
            return [
                { 
                    label: 'Acquisition ID', 
                    value: this.catalogue.acquisition_id,
                    isLink: true,
                    onClick: () => {
                        self.$router.push({
                            name: 'view-acquisition',
                            params: { id: self.catalogue.acquisition_id }
                        })
                    }
                },
                { label: 'Place of Publication', value: this.catalogue.place_of_publication || 'N/A' },
                { label: 'Dewey Classification', value: this.catalogue.dewey || 'N/A' },
                { label: 'Cutter Number', value: this.catalogue.cutter_number || 'N/A' },
                { label: 'Number of Copies', value: this.catalogue.number_of_copies },
                { label: 'Provisional', value: this.catalogue.is_provisional ? 'Yes' : 'No' },
            ]
        }
    },
    mounted() {
        this.catalogueId = this.$route.params.id
        
        // Check if coming from successful update
        if (this.$route.query.success === 'true') {
            this.bannerMessage = 'Catalogue updated successfully!'
            this.bannerType = 'success'
        }

        if (this.catalogueId) {
            this.loadCatalogue()
        }

        // Real-time listener for catalogue updates
        waitForEchoConnection().then(() => {
            subscribeToActions((data) => {
                if (data.resource_type === 'catalogue' && String(data.resource_id) === String(this.catalogueId)) {
                    console.log(`🔄 Real-time update detected for catalogue ${this.catalogueId}`)
                    this.loadCatalogue()
                }
            })
        })
    },
    methods: {
        async loadCatalogue() {
            this.isLoading = true
            try {
                this.catalogue = await getCatalogue(this.catalogueId)
            } catch (error) {
                console.error('Failed to load catalogue:', error)
                this.dialog = {
                    visible: true,
                    title: 'Load Failed',
                    message: 'Failed to load catalogue',
                    isError: true,
                }
            } finally {
                this.isLoading = false
            }
        },
        formatStatus(status) {
            if (!status) return 'N/A'
            return status.toString().replace(/_/g, ' ').toUpperCase()
        },
        editCatalogue() {
            this.$router.push({
                name: 'edit-catalogue',
                params: { id: this.catalogueId }
            })
        },
        printAllQrCodes() {
            if (!this.catalogue.books || this.catalogue.books.length === 0) {
                this.dialog = {
                    visible: true,
                    title: 'No Books Available',
                    message: 'No books available to print',
                    isError: true,
                }
                return
            }
            printQrCodes(this.catalogue.books, this.catalogue.title)
        },
        printSingleQrCode(book) {
            printQrCodes([book], book.title || this.catalogue.title)
        },
        goBack() {
            try { this.$router.back() } catch (e) { console.warn('Failed to navigate back', e) }
        },
    },
}
</script>
