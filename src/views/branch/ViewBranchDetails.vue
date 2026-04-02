<template>
    <AppBar title="Branch Details" />

    <StatusBanner
        v-if="bannerMessage"
        :type="bannerType"
        :message="bannerMessage"
        :duration="5000"
        class="mt-4"
    />

    <v-container class="mt-8">
        <v-row>
            <v-col cols="12">
                <v-card elevation="0" class="py-3" v-if="!isLoading">
                    <v-card-text>
                        <InfoTable
                            title="Branch Information"
                            :fields="branchFieldsData"
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
                                v-if="canEdit && !branch?.is_archived"
                                color="primary"
                                @click="editBranch"
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
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import AppBar from '@/components/AppBar.vue'
import InfoTable from '@/components/InfoTable.vue'
import StatusBanner from '@/components/StatusBanner.vue'
import { getBranch } from '@/services/branch'
import { ACTIONS, can as canCheck } from '@/services/permission'

    export default {
        name: 'view-branch',
        components: { AppBar, InfoTable, StatusBanner },
    props: {
        id: {
            type: [String, Number],
            required: true,
        },
    },
    data() {
        return {
            isLoading: true,
            branch: null,
            canEdit: canCheck(ACTIONS.EDIT),
            bannerMessage: '',
            bannerType: 'success',
        }
    },
    created() {
        if (this.$route.query.success === 'true' || this.$route.query.success === true) {
            this.bannerMessage = 'Branch updated successfully!'
            this.bannerType = 'success'
        }
        this.loadBranch()
    },
    mounted() {
        // Listen for real-time updates to this specific branch
        window.addEventListener('action:branch', this.handleRealtimeUpdate)
    },
        beforeUnmount() {
            window.removeEventListener('action:branch', this.handleRealtimeUpdate)
        },
        computed: {
            branchFieldsData() {
                if (!this.branch) return []
                return [
                    { label: 'ID', value: this.branch.id },
                    { label: 'Name', value: this.branch.name },
                    { label: 'Address', value: this.branch.address },
                    { label: 'Details', value: this.branch.details },
                    { label: 'Public IP', value: this.branch.public_ip },
                    { label: 'Public IPv6', value: this.branch.public_ipv6 },
                    { label: 'Main Branch', value: !!this.branch.is_main_branch },
                    { label: 'Status', value: this.branch.is_archived ? 'Archived' : 'Active' },
                    { label: 'Created By', value: this.branch.created_by },
                    { label: 'Updated By', value: this.branch.updated_by },
                ]
            },
        },
        methods: {
        async loadBranch() {
            this.isLoading = true
            try {
                this.branch = await getBranch(this.id)
            } catch (error) {
                this.showDialog('Load Failed', 'Failed to load branch: ' + (error.message || 'Unknown error'), true)
                this.$router.push({ name: 'branch-management' })
            } finally {
                this.isLoading = false
            }
        },
        handleRealtimeUpdate: function(event) {
            // Only reload if this update affects this branch
            if (event.detail.resource_id == this.id) {
                this.loadBranch()
            }
        },
        editBranch() {
            this.$router.push({ name: 'edit-branch', params: { id: this.branch.id } })
        },
        goBack() {
            this.$router.back()
        },
    },
}
</script>
