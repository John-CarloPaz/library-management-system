<template>
    <AppBar title="Procurement Details">
        <template #title-actions>
            <v-btn text @click="goBack">Back</v-btn>
            <v-btn color="primary" @click="editProcurement" :disabled="isLoading">Edit</v-btn>
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

        <v-card elevation="1" class="py-3" v-if="!isLoading">
            <v-card-text>
                <InfoTable 
                    title="Procurement Information"
                    :fields="procurementFieldsData"
                />

                <InfoTable 
                    title="Request Details"
                    :fields="requestFieldsData"
                />

                <div v-if="procurement.acquisitions && procurement.acquisitions.length > 0" class="mt-6">
                    <v-divider class="mb-4"></v-divider>
                    <p class="font-weight-bold mb-2">Related Acquisitions</p>
                    <Table 
                        :headers="acquisitionHeaders" 
                        :items="procurement.acquisitions" 
                        item-key="id"
                    >
                        <template #actions="{ item }">
                            <v-btn size="x-small" color="primary" @click="viewAcquisition(item)">View</v-btn>
                        </template>
                    </Table>
                </div>
            </v-card-text>
        </v-card>

        <v-card elevation="1" v-if="isLoading" class="py-3">
            <v-card-text>
                <v-progress-linear indeterminate></v-progress-linear>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script>
import AppBar from '@/components/AppBar.vue'
import Table from '@/components/Table.vue'
import StatusBanner from '@/components/StatusBanner.vue'
import InfoTable from '@/components/InfoTable.vue'
import { getProcurement } from '@/services/procurement'
import { subscribeToActions, waitForEchoConnection } from '@/services/realtime'

export default {
    name: 'view-procurement-details',
    components: { AppBar, Table, StatusBanner, InfoTable },
    props: {
        id: {
            type: [String, Number],
            required: true,
        },
    },
    data() {
        return {
            isLoading: true,
            bannerMessage: '',
            bannerType: 'success',
            procurement: null,
            acquisitionHeaders: [
                { text: 'ID', value: 'id' },
                { text: 'Acquisition Status', value: 'acquisition_status' },
                { text: 'Quantity Acquired', value: 'quantity_acquired' },
                { text: 'Supplier', value: 'supplier_name' },
                { text: 'Actions', value: 'actions', sortable: false },
            ],
        }
    },
    computed: {
        procurementFieldsData() {
            if (!this.procurement) return []

            return [
                { label: 'ID', value: this.procurement.id },
                { label: 'Title', value: this.procurement.title },
                { label: 'Author', value: this.procurement.author },
                { label: 'Publisher', value: this.procurement.publisher || 'N/A' },
                { label: 'ISBN', value: this.procurement.isbn || 'N/A' },
            ]
        },
        requestFieldsData() {
            if (!this.procurement) return []

            return [
                { label: 'Edition', value: this.procurement.edition || 'N/A' },
                { label: 'Place of Publication', value: this.procurement.place_of_publication || 'N/A' },
                { label: 'Year of Publication', value: this.procurement.year_of_publication || 'N/A' },
                { label: 'Quantity Requested', value: this.procurement.quantity_requested },
                { label: 'Approval Status', value: this.formatApprovalStatus(this.procurement.admin_approval) },
                { label: 'Requested By', value: this.procurement.created_by },
                { label: 'Created At', value: this.procurement.created_at },
            ]
        },
    },
    mounted() {
        // Check if coming from successful update
        if (this.$route.query.success === 'true') {
            this.bannerMessage = 'Procurement request updated successfully!'
            this.bannerType = 'success'
        }

        this.loadProcurement()

        // Real-time listener for procurement updates
        waitForEchoConnection().then(() => {
            subscribeToActions((data) => {
                if (data.resource_type === 'procurement' && String(data.resource_id) === String(this.id)) {
                    console.log(`🔄 Real-time update detected for procurement ${this.id}`)
                    this.loadProcurement()
                }
            })
        })
    },
    methods: {
        async loadProcurement() {
            this.isLoading = true
            try {
                this.procurement = await getProcurement(this.id, true)
            } catch (error) {
                console.error('Failed to load procurement:', error)
                this.dialog = {
                    visible: true,
                    title: 'Load Failed',
                    message: 'Failed to load procurement',
                    isError: true,
                }
            } finally {
                this.isLoading = false
            }
        },
        formatApprovalStatus(status) {
            const statusMap = {
                'pending': 'Pending',
                'approved': 'Approved',
                'rejected': 'Rejected',
            }
            return statusMap[status] || status
        },
        editProcurement() {
            this.$router.push({
                name: 'edit-procurement',
                params: { id: this.id }
            })
        },
        viewAcquisition(acquisition) {
            this.$router.push({
                name: 'view-acquisition',
                params: { id: acquisition.id }
            })
        },
        goBack() {
            try { this.$router.back() } catch (e) { console.warn('Failed to navigate back', e) }
        },
    },
}
</script>
