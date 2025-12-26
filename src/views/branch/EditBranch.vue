<template>
    <AppBar title="Edit Branch">
        <template #button-actions>
            <v-btn variant="tonal" @click="goBack">Back</v-btn>
        </template>
    </AppBar>

    <v-container class="mt-8">
        <v-row justify="center">
            <v-col cols="12" md="8">
                <v-card v-if="branch">
                    <v-card-title>Edit Branch</v-card-title>
                    <v-card-text>
                        <v-form ref="form" @submit.prevent="submitForm">
                            <v-text-field
                                v-model="form.name"
                                label="Branch Name"
                                variant="outlined"
                                density="compact"
                                class="mb-4"
                                :rules="[v => !!v || 'Name is required']"
                            />

                            <v-text-field
                                v-model="form.address"
                                label="Address"
                                variant="outlined"
                                density="compact"
                                class="mb-4"
                                :rules="[v => !!v || 'Address is required']"
                            />

                            <v-text-field
                                v-model="form.details"
                                label="Details"
                                variant="outlined"
                                density="compact"
                                class="mb-4"
                                :rules="[v => !!v || 'Details are required']"
                            />

                            <v-text-field
                                v-model="form.public_ip"
                                label="Public IP Address"
                                variant="outlined"
                                density="compact"
                                class="mb-4"
                                :rules="[v => !!v || 'Public IP is required', validateIp]"
                            />

                            <v-checkbox
                                v-model="form.is_main_branch"
                                label="Mark as Main Branch"
                                class="mb-4"
                            />

                            <div class="d-flex gap-2">
                                <v-btn color="primary" type="submit" :loading="submitting">
                                    Update Branch
                                </v-btn>
                                <v-btn variant="outlined" @click="goBack">Cancel</v-btn>
                            </div>
                        </v-form>
                    </v-card-text>
                </v-card>
                <v-card v-else>
                    <v-card-text>Loading...</v-card-text>
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
import AppBar from '@/components/AppBar.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { getBranch, editBranch } from '@/services/branch'
import { ACTIONS, can as canCheck } from '@/services/permission'

export default {
    name: 'edit-branch',
    components: { AppBar, ErrorDialog },
    props: {
        id: {
            type: [String, Number],
            required: true,
        },
    },
    data() {
        return {
            branch: null,
            form: {
                name: '',
                address: '',
                details: '',
                public_ip: '',
                is_main_branch: false,
            },
            submitting: false,
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: false,
            },
        }
    },
    created() {
        if (!canCheck(ACTIONS.EDIT)) {
            this.$router.push({ name: 'branch-management' })
            return
        }
        this.loadBranch()
    },
    methods: {
        validateIp(value) {
            if (!value) return 'IP address is required'
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
            return ipRegex.test(value) || 'Please enter a valid IP address'
        },
        async loadBranch() {
            try {
                const branch = await getBranch(this.id)
                this.form = {
                    name: this.branch.name,
                    address: this.branch.address,
                    details: this.branch.details,
                    public_ip: this.branch.public_ip,
                    is_main_branch: this.branch.is_main_branch,
                }
            } catch (error) {
                this.showDialog('Load Failed', 'Failed to load branch: ' + (error.message || 'Unknown error'), true)
                this.$router.push({ name: 'branch-management' })
            }
        },
        async submitForm() {
            if (!this.$refs.form.validate()) return

            this.submitting = true
            try {
                await editBranch(this.id, this.form)
                this.$router.push({ name: 'branch-management' })
            } catch (error) {
                this.showDialog('Error', `Failed to update branch: ${error.message}`, true)
            } finally {
                this.submitting = false
            }
        },
        goBack() {
            this.$router.back()
        },
        showDialog(title, message, isError) {
            this.dialog = { visible: true, title, message, isError }
        },
    },
}
</script>
