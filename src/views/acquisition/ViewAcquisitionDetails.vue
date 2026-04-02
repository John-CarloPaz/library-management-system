<template>
    <AppBar title="Acquisition Details" />
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
                    title="Acquisition Details"
                    :fields="acquisitionDetailsData"
                />
                <InfoTable 
                    title="Book Details"
                    :fields="bookDetailsData"
                />
                <v-row class="mt-4" justify="end">
                    <v-btn
                        variant="outlined"
                        class="mr-2 bg-white text-primary"
                        @click="goBack"
                    >
                        Back
                    </v-btn>
                    <v-btn
                        v-if="canEdit"
                        color="primary"
                        @click="editAcquisition"
                    >
                        Edit
                    </v-btn>
                </v-row>
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
import { getAcquisition } from '@/services/acquisition'
import { subscribeToActions, waitForEchoConnection } from '@/services/realtime'
import { ACTIONS, can as canCheck } from '@/services/permission'

export default {
    name: 'view-acquisition-details',
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
            acquisition: null,
            canEdit: canCheck(ACTIONS.EDIT),
        }
    },
    computed: {
        bookDetailsData() {
            if (!this.acquisition) return []

            return [
                { label: 'Title', value: this.acquisition.title },
                { label: 'Author', value: this.acquisition.author },
                { label: 'Edition', value: this.acquisition.edition },
                { label: 'ISBN', value: this.acquisition.isbn },
                { label: 'Publisher', value: this.acquisition.publisher },
                { label: 'Place of Publication', value: this.acquisition.place_of_publication },
                { label: 'Year of Publication', value: this.acquisition.year_of_publication },
            ]
        },
        acquisitionDetailsData() {
            if (!this.acquisition) return []

            const self = this
            return [
                { label: 'ID', value: this.acquisition.id },
                {
                    label: 'Procurement ID',
                    value: this.acquisition.procurement_id,
                    isLink: true,
                    onClick: () => {
                        self.$router.push({
                            name: 'view-procurement',
                            params: { id: self.acquisition.procurement_id }
                        })
                    }
                },
                { label: 'Quantity Requested', value: this.acquisition.quantity_requested },
                { label: 'Acquisition Method', value: this.formatMethod(this.acquisition.acquisition_method) },
                { label: 'Supplier Name', value: this.acquisition.supplier_name },
                { label: 'Cost', value: this.acquisition.cost ? `₱${this.acquisition.cost.toFixed(2)}` : null },
                { label: 'Date Acquired', value: this.acquisition.date_acquired },
                { label: 'Quantity Acquired', value: this.acquisition.quantity_acquired },
                { label: 'Status', value: this.acquisition.acquisition_status },
            ]
        }
    },
    mounted() {
        // Check if coming from successful update
        if (this.$route.query.success === 'true') {
            this.bannerMessage = 'Acquisition updated successfully!'
            this.bannerType = 'success'
        }

        if (this.id) {
            this.loadAcquisition()
        }

        // Real-time listener for acquisition updates
        waitForEchoConnection().then(() => {
            subscribeToActions((data) => {
                if (data.resource_type === 'acquisition' && String(data.resource_id) === String(this.id)) {
                    console.log(`🔄 Real-time update detected for acquisition ${this.id}`)
                    this.loadAcquisition()
                }
            })
        })
    },
    methods: {
        async loadAcquisition() {
            this.isLoading = true
            try {
                this.acquisition = await getAcquisition(this.id)
            } catch (error) {
                console.error('Failed to load acquisition:', error)
                this.dialog = {
                    visible: true,
                    title: 'Load Failed',
                    message: 'Failed to load acquisition',
                    isError: true,
                }
            } finally {
                this.isLoading = false
            }
        },
        formatMethod(method) {
            if (!method) return 'N/A'
            const methods = {
                book_fair: 'Book Fair',
                supplier: 'Supplier',
                donation: 'Donation',
            }
            return methods[method] || method
        },
        editAcquisition() {
            this.$router.push({
                name: 'edit-acquisition',
                params: { id: this.id }
            })
        },
        goBack() {
            try { this.$router.back() } catch (e) { console.warn('Failed to navigate back', e) }
        },
    },
}
</script>
