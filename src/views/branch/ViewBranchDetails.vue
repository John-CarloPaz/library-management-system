<template>
    <AppBar title="Branch Details">
        <template #button-actions>
            <v-btn variant="tonal" @click="goBack">Back</v-btn>
            <v-btn v-if="canEdit && !branch?.is_archived" variant="tonal" @click="editBranch">Edit</v-btn>
        </template>
    </AppBar>

    <v-container class="mt-8">
        <v-row justify="center">
            <v-col cols="12" md="8">
                <v-card v-if="branch">
                    <v-card-title>{{ branch.name }}</v-card-title>
                    <v-card-text>
                        <v-list>
                            <v-list-item title="ID" :subtitle="branch.id" />
                            <v-list-item title="Name" :subtitle="branch.name" />
                            <v-list-item title="Address" :subtitle="branch.address" />
                            <v-list-item title="Details" :subtitle="branch.details" />
                            <v-list-item title="Public IP" :subtitle="branch.public_ip" />
                            <v-list-item title="Main Branch">
                                <template #subtitle>
                                    <v-chip v-if="branch.is_main_branch" color="primary" size="small">
                                        Yes
                                    </v-chip>
                                    <span v-else>No</span>
                                </template>
                            </v-list-item>
                            <v-list-item title="Status">
                                <template #subtitle>
                                    <v-chip :color="branch.is_archived ? 'red' : 'green'" size="small">
                                        {{ branch.is_archived ? 'Archived' : 'Active' }}
                                    </v-chip>
                                </template>
                            </v-list-item>
                            <v-list-item title="Created By" :subtitle="branch.created_by" />
                            <v-list-item title="Updated By" :subtitle="branch.updated_by" />
                        </v-list>
                    </v-card-text>
                </v-card>
                <v-card v-else>
                    <v-card-text>Loading...</v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import AppBar from '@/components/AppBar.vue'
import { getBranch } from '@/services/branch'
import { ACTIONS, can as canCheck } from '@/services/permission'

export default {
    name: 'view-branch',
    components: { AppBar },
    props: {
        id: {
            type: [String, Number],
            required: true,
        },
    },
    data() {
        return {
            branch: null,
            canEdit: canCheck(ACTIONS.EDIT),
        }
    },
    created() {
        this.loadBranch()
    },
    mounted() {
        // Listen for real-time updates to this specific branch
        window.addEventListener('action:branch', this.handleRealtimeUpdate)
    },
    beforeUnmount() {
        window.removeEventListener('action:branch', this.handleRealtimeUpdate)
    },
    methods: {
        async loadBranch() {
            try {
                this.branch = await getBranch(this.id)
            } catch (error) {
                this.showDialog('Load Failed', 'Failed to load branch: ' + (error.message || 'Unknown error'), true)
                this.$router.push({ name: 'branch-management' })
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
