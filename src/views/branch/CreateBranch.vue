<template>
    <AppBar title="Create Branch">
        <template #button-actions>
            <v-btn variant="tonal" @click="goBack">Back</v-btn>
        </template>
    </AppBar>

    <v-container class="mt-8">
        <v-row justify="center">
            <v-col cols="12" md="8">
                <v-card>
                    <v-card-title>New Branch</v-card-title>
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
                                    Create Branch
                                </v-btn>
                                <v-btn variant="outlined" @click="goBack">Cancel</v-btn>
                            </div>
                        </v-form>
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
import AppBar from '@/components/AppBar.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { createBranch } from '@/services/branch'
import { ACTIONS, can as canCheck } from '@/services/permission'

export default {
    name: 'create-branch',
    components: { AppBar, ErrorDialog },
    data() {
        return {
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
        if (!canCheck(ACTIONS.CREATE)) {
            this.$router.push({ name: 'branch-management' })
        }
    },
    methods: {
        validateIp(value) {
            if (!value) return 'IP address is required'
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
            return ipRegex.test(value) || 'Please enter a valid IP address'
        },
        async submitForm() {
            if (!this.$refs.form.validate()) return

            this.submitting = true
            try {
                await createBranch(this.form)
                this.$router.push({ name: 'branch-management' })
            } catch (error) {
                this.showDialog('Error', `Failed to create branch: ${error.message}`, true)
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
