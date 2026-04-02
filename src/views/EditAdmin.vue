<template>
    <AppBar title="Edit Admin">
        <template #title-actions>
            <v-btn text @click="cancel">Back</v-btn>
        </template>
    </AppBar>
    <v-container>
        <v-card elevation="0" class="py-3">
            <v-card-text>
                <v-progress-linear v-if="isLoading" indeterminate></v-progress-linear>
                
                <v-form ref="formRef" @submit.prevent="onSubmit" v-if="!isLoading">
    
                    <v-divider class="border-opacity-25 mb-4"></v-divider>

                    <!-- First row: First, Last, Middle, Suffix -->
                    <v-row class="mb-4" dense>
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

                    <!-- Username and Employee ID row -->
                    <v-row class="mb-4" dense>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.username" label="Username" :error-messages="errors.username"
                                required variant="solo" />
                        </v-col>

                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.employee_id" label="Employee ID"
                                :error-messages="errors.employee_id" variant="solo" />
                        </v-col>
                    </v-row>

                    <p class="text-subtitle-1 font-weight-semibold">Email and Account</p>
                    <v-divider class="border-opacity-25 mb-4"></v-divider>
                    <v-row class="mb-4" dense>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.email" label="Email" :error-messages="errors.email" required
                                variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.password" label="Password" type="password" :error-messages="errors.password"
                                variant="solo" hint="Leave blank to keep current password" persistent-hint />
                        </v-col>
                    </v-row>

                    <p class="text-subtitle-1 font-weight-semibold">Employment</p>
                    <v-divider class="border-opacity-25 mb-4"></v-divider>
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-select v-model="form.role" :items="roleItems" label="Role" :error-messages="errors.role"
                                required variant="solo" :disabled="isBranchAdmin" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-select v-model="form.branch_id" :items="branchItems" label="Branch"
                                :error-messages="errors.branch_id" required variant="solo" :disabled="isBranchAdmin" />
                        </v-col>
                    </v-row>

                    <!-- Employee Type and Status row -->
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-select v-model="form.employee_type" :items="employeeTypeItems" label="Employee Type"
                                :error-messages="errors.employee_type" required variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-select v-model="form.is_active" :items="statusItems" label="Status"
                                :error-messages="errors.is_active" required variant="solo" />
                        </v-col>
                    </v-row>

                    <v-row>
                        <v-col class="d-flex justify-end">
                            <v-btn 
                                color="warning" 
                                variant="outlined"
                                @click="resetPassword" 
                                :loading="isResetting"
                                :disabled="isSubmitting || isResetting">
                                Reset Password to Default
                            </v-btn>
                            <v-btn text @click="cancel" class="mx-3" :disabled="isSubmitting">Cancel</v-btn>
                            <v-btn color="primary" @click="onSubmit" :loading="isSubmitting" :disabled="isSubmitting">Update</v-btn>
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

    <!-- Confirm Dialog for Reset Password -->
    <v-dialog v-model="confirmDialog.visible" max-width="480px">
        <v-card>
            <v-card-title class="text-h6">{{ confirmDialog.title }}</v-card-title>
            <v-card-text>
                <div>{{ confirmDialog.message }}</div>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn variant="text" @click="confirmDialog.visible = false">Cancel</v-btn>
                <v-btn color="error" @click="resetPasswordConfirmed" :loading="isResetting">Reset</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
import AppBar from '@/components/AppBar.vue';
import ErrorDialog from '@/components/ErrorDialog.vue';
import { getAdmin, updateAdmin, validateAdmin } from '@/services/admin'
import { listActiveBranches } from '@/services/branch'
import { getSession } from '@/services/auth'

export default {
    name: 'edit-admin',
    components: { AppBar, ErrorDialog },
    data() {
        return {
            isLoading: false,
            isSubmitting: false,
            isResetting: false,
            session: null,
            isBranchAdmin: false,
            sessionBranchId: null,
            originalRole: null,
            originalBranchId: null,
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: false,
            },
            confirmDialog: {
                visible: false,
                title: '',
                message: '',
            },
            adminId: null,
            branchItems: [],
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
            statusItems: [
                { value: true, title: 'Active' },
                { value: false, title: 'Inactive' },
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
                is_active: true,
            },
            errors: {},
        }
    },
    mounted() {
        try {
            this.session = getSession() || null
            const role = this.session && this.session.role ? String(this.session.role).toLowerCase() : ''
            this.isBranchAdmin = role === 'branch_admin'
            const rawBranch = this.session && this.session.branch_id != null ? this.session.branch_id : null
            const n = rawBranch != null ? Number(rawBranch) : null
            this.sessionBranchId = Number.isFinite(n) ? n : rawBranch
        } catch (e) {
            this.session = null
            this.isBranchAdmin = false
            this.sessionBranchId = null
        }

        this.adminId = this.$route.params.id
        if (this.adminId) {
            this.loadAdmin()
        }
        this.loadBranches()
    },
    methods: {
        async loadBranches() {
            try {
                const branches = await listActiveBranches()
                this.branchItems = Array.isArray(branches)
                    ? branches.map(b => ({ value: b.id, title: b.name }))
                    : []
            } catch (e) {
                console.error('Failed to load branches:', e)
                this.branchItems = []
            }
        },
        async loadAdmin() {
            this.isLoading = true
            try {
                const admin = await getAdmin(this.adminId)

                // Branch admin hard-guard: only allow editing admins in own branch; never allow editing super_admin.
                if (this.isBranchAdmin) {
                    if (admin && admin.role === 'super_admin') {
                        this.showDialog('Permission Denied', 'You cannot edit a super admin account.', true)
                        setTimeout(() => this.$router.push({ name: 'admin-management' }), 800)
                        return
                    }
                    if (this.sessionBranchId != null && Number(admin.branch_id) !== Number(this.sessionBranchId)) {
                        this.showDialog('Permission Denied', 'You can only edit admins under your own branch.', true)
                        setTimeout(() => this.$router.push({ name: 'admin-management' }), 800)
                        return
                    }
                }

                this.originalRole = admin.role || null
                this.originalBranchId = admin.branch_id || null

                // Populate form with admin data
                this.form = {
                    username: admin.username || '',
                    email: admin.email || '',
                    employee_id: admin.employee_id || '',
                    password: '',
                    first_name: admin.first_name || '',
                    last_name: admin.last_name || '',
                    middle_name: admin.middle_name || '',
                    suffix: admin.suffix || '',
                    role: admin.role || null,
                    branch_id: admin.branch_id || null,
                    employee_type: admin.employee_type || null,
                    is_active: admin.is_active !== false,
                }
                this.errors = {}
            } catch (error) {
                console.error('Failed to load admin:', error)
                this.showDialog('Load Failed', 'Failed to load admin: ' + (error.message || 'Unknown error'), true)
                // Navigate back on error
                setTimeout(() => {
                    this.$router.push({ name: 'admin-management' })
                }, 2000)
            } finally {
                this.isLoading = false
            }
        },
        cancel() {
            try { this.$router.back() } catch (e) { console.warn('Failed to navigate back', e) }
        },
        validate() {
            // For update, password is optional - create validation data without password
            const dataToValidate = {
                username: this.form.username,
                email: this.form.email,
                first_name: this.form.first_name,
                last_name: this.form.last_name,
                middle_name: this.form.middle_name,
                suffix: this.form.suffix,
                employee_id: this.form.employee_id,
                role: this.form.role,
                branch_id: this.form.branch_id,
                employee_type: this.form.employee_type,
                is_active: this.form.is_active,
                // Password intentionally excluded - it's optional on update
            }
            // Only validate password if it was provided
            if (this.form.password && this.form.password.trim()) {
                dataToValidate.password = this.form.password
            }
            const { isValid, errors } = validateAdmin(dataToValidate)
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
                // Only include fields that should be updated
                const updateData = {
                    username: this.form.username,
                    email: this.form.email,
                    first_name: this.form.first_name,
                    last_name: this.form.last_name,
                    middle_name: this.form.middle_name || null,
                    suffix: this.form.suffix || null,
                    employee_id: this.form.employee_id || null,
                    role: this.isBranchAdmin ? this.originalRole : this.form.role,
                    branch_id: this.isBranchAdmin ? this.originalBranchId : this.form.branch_id,
                    employee_type: this.form.employee_type,
                    is_active: this.form.is_active,
                }

                // Only include password if it was changed
                if (this.form.password) {
                    updateData.password = this.form.password
                }

                const updatedAdmin = await updateAdmin(this.adminId, updateData)

                console.log('Admin updated successfully:', updatedAdmin)

                // Dispatch event so other tabs/components know to refresh
                try {
                    window.dispatchEvent(new CustomEvent('admin:updated'))
                } catch (e) { /* noop */ }

                // Navigate to view page with success flag
                setTimeout(() => {
                    this.$router.push({ 
                        name: 'view-admin', 
                        params: { id: this.adminId },
                        query: { success: true }
                    })
                }, 500)
            } catch (error) {
                console.error('Failed to update admin:', error)
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
                    this.showDialog('Update Failed', 'Error: ' + (error.message || 'Unknown error'), true)
                }
            } finally {
                this.isSubmitting = false
            }
        },
        resetPassword() {
            this.confirmDialog = {
                visible: true,
                title: 'Confirm Password Reset',
                message: 'Reset password to default (LIB@SPCF)?',
            }
        },

        async resetPasswordConfirmed() {
            this.confirmDialog.visible = false
            this.isResetting = true
            try {
                // Update admin with default password
                const updateData = {
                    username: this.form.username,
                    email: this.form.email,
                    first_name: this.form.first_name,
                    last_name: this.form.last_name,
                    middle_name: this.form.middle_name || null,
                    suffix: this.form.suffix || null,
                    employee_id: this.form.employee_id || null,
                    role: this.isBranchAdmin ? this.originalRole : this.form.role,
                    branch_id: this.isBranchAdmin ? this.originalBranchId : this.form.branch_id,
                    employee_type: this.form.employee_type,
                    is_active: this.form.is_active,
                    password: 'LIB@SPCF', // Reset to default password
                }

                await updateAdmin(this.adminId, updateData)

                console.log('Password reset successfully')

                // Dispatch event so other tabs/components know to refresh
                try {
                    window.dispatchEvent(new CustomEvent('admin:updated'))
                } catch (e) { /* noop */ }

                // Navigate back
                setTimeout(() => {
                    this.$router.push({ name: 'admin-management' })
                }, 1500)
            } catch (error) {
                console.error('Failed to reset password:', error)
                const serverMsg = error?.response?.data?.message || (error?.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(' ') : null)
                const message = serverMsg || (typeof error?.response?.data === 'string' ? error.response.data : error.message || 'Unknown error')
                this.showDialog('Password Reset Failed', message, true)
            } finally {
                this.isResetting = false
            }
        },
        showDialog(title, message, isError = false) {
            this.dialog = { visible: true, title, message, isError }
        }
    }
}
</script>

<style scoped>
.v-card-title {
    font-weight: 600
}
</style>
