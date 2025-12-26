<template>
    <AppBar title="Create Admin">
        <template #title-actions>
            <v-btn text @click="cancel">Back</v-btn>
        </template>
    </AppBar>
    <v-container>
        <v-card elevation="1" class="py-3">
            <v-card-text>
                <v-form ref="formRef" @submit.prevent="onSubmit">
                    <!-- First row: First, Last, Middle, Suffix -->
                    <v-row>
                        <v-col cols="12" md="3">
                            <v-text-field v-model="form.first_name" label="First Name"
                                :error-messages="errors.first_name" required variant="solo" />
                        </v-col>
                        <v-col cols="12" md="3">
                            <v-text-field v-model="form.last_name" label="Last Name" :error-messages="errors.last_name"
                                required variant="solo" />
                        </v-col>
                        <v-col cols="12" md="3">
                            <v-text-field v-model="form.middle_name" label="Middle Name"
                                :error-messages="errors.middle_name" variant="solo" />
                        </v-col>
                        <v-col cols="12" md="3">
                            <v-text-field v-model="form.suffix" label="Suffix" :error-messages="errors.suffix"
                                variant="solo" />
                        </v-col>
                    </v-row>

                    <!-- Username and Branch ID row -->
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.username" label="Username" :error-messages="errors.username"
                                required variant="solo" />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.employee_id" label="Employee ID"
                                :error-messages="errors.employee_id" variant="solo" />
                        </v-col>
                    </v-row>

                    <!-- Email and Password on one row -->
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.email" label="Email" :error-messages="errors.email" required
                                variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.password" label="Password" type="password"
                                :error-messages="errors.password" required variant="solo" />
                        </v-col>
                    </v-row>

                    <!-- Role and Employee ID on one row -->
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-select v-model="form.role" :items="roleItems" label="Role" :error-messages="errors.role"
                                required variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-select v-model="form.branch_id" :items="branchItems" label="Branch"
                                :error-messages="errors.branch_id" required variant="solo" />
                        </v-col>
                    </v-row>
                    <!-- Employee Type row -->
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-select v-model="form.employee_type" :items="employeeTypeItems" label="Employee Type"
                                :error-messages="errors.employee_type" required variant="solo" />
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col class="d-flex justify-end">
                            <v-btn text @click="cancel" class="mr-3" :disabled="isSubmitting">Cancel</v-btn>
                            <v-btn color="primary" @click="onSubmit" :loading="isSubmitting" :disabled="isSubmitting">Create</v-btn>
                        </v-col>
                    </v-row>
                </v-form>
            </v-card-text>
        </v-card>
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
import { createAdmin, validateAdmin } from '@/services/admin'

export default {
    name: 'create-admin',
    components: { AppBar, ErrorDialog },
    data() {
        return {
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: false,
            },
            // Simple branch options placeholder (replace with real branches when available)
            branchItems: [1, 2, 3, 4, 5].map(n => ({ value: n, title: `Branch ${n}` })),
            roleItems: [
                { value: 'super_admin', title: 'Super Admin' },
                { value: 'branch_admin', title: 'Branch Admin' },
                { value: 'admin', title: 'Admin' },
            ],
            employeeTypeItems: [
                { value: 'dean', title: 'Dean' },
                { value: 'administrator', title: 'Administrator' },
                { value: 'assistant', title: 'Assistant' },
                { value: 'chief_librarian', title: 'Chief Librarian' },
            ],
            form: {
                username: '',
                email: '',
                employee_id: '',
                password: '',
                first_name: '',
                last_name: '',
                middle_name: '',
                suffix: '',
                role: null,
                branch_id: null,
                employee_type: null,
            },
            errors: {},
            isSubmitting: false,
        }
    },
    methods: {
        resetErrors() {
            Object.keys(this.errors).forEach(k => (this.errors[k] = []))
        },
        cancel() {
            // Navigate back to previous page
            try { this.$router.back() } catch (e) { console.warn('Failed to navigate back', e) }
        },
        validate() {
            const { isValid, errors } = validateAdmin(this.form)
            this.errors = errors
            return isValid
        },
        async onSubmit() {
            if (!this.validate()) {
                console.log('Validation failed', this.errors)
                return
            }

            this.isSubmitting = true

            try {
                const newAdmin = await createAdmin({
                    username: this.form.username,
                    email: this.form.email,
                    password: this.form.password,
                    first_name: this.form.first_name,
                    last_name: this.form.last_name,
                    middle_name: this.form.middle_name || null,
                    suffix: this.form.suffix || null,
                    employee_id: this.form.employee_id || null,
                    role: this.form.role,
                    branch_id: this.form.branch_id,
                    employee_type: this.form.employee_type,
                    is_active: true,
                })

                console.log('Admin created successfully:', newAdmin)

                // Reset form
                this.form = {
                    username: '',
                    email: '',
                    employee_id: '',
                    password: '',
                    first_name: '',
                    last_name: '',
                    middle_name: '',
                    suffix: '',
                    role: null,
                    branch_id: null,
                    employee_type: null,
                }
                this.errors = {}

                // Navigate back to admin list
                setTimeout(() => {
                    this.$router.push({ name: 'admin-management' })
                }, 1500)
            } catch (error) {
                console.error('Failed to create admin:', error)
                // Parse error response if it contains field errors
                if (typeof error.message === 'string' && error.message.includes(':')) {
                    const lines = error.message.split('\n')
                    lines.forEach(line => {
                        const [field, ...msg] = line.split(':')
                        if (field && msg) {
                            this.errors[field.trim()] = [msg.join(':').trim()]
                        }
                    })
                } else {
                    this.showDialog('Create Failed', 'Error: ' + (error.message || 'Unknown error'), true)
                }
            } finally {
                this.isSubmitting = false
            }
        },
        cancel() {
            this.$router.back()
        },
        showDialog(title, message, isError = false) {
            this.dialog = { visible: true, title, message, isError }
        },
    },
}
</script>

<style scoped>
.v-card-title {
    font-weight: 600
}
</style>
