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

                    <v-row>
                        <v-col class="d-flex justify-end">
                            <v-btn text @click="cancel" class="mr-3">Cancel</v-btn>
                            <v-btn color="primary" @click="onSubmit">Create</v-btn>
                        </v-col>
                    </v-row>
                </v-form>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script>
import admins from '@/data/admins.json'
import AppBar from '@/components/AppBar.vue';

export default {
    name: 'create-admin',
    components: { AppBar },
    data() {
        return {
            // Simple branch options placeholder (replace with real branches when available)
            branchItems: [1, 2, 3, 4, 5].map(n => ({ value: n, title: `Branch ${n}` })),
            roleItems: [
                { value: 'super_admin', title: 'Super Admin' },
                { value: 'branch_admin', title: 'Branch Admin' },
                { value: 'admin', title: 'Admin' },
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
            },
            errors: {},
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
        addError(field, msg) {
            if (!this.errors[field]) this.errors[field] = []
            this.errors[field].push(msg)
        },
        validate() {
            this.resetErrors()

            // username: required|string|max:255
            if (!this.form.username || !this.form.username.toString().trim()) this.addError('username', 'Username is required')
            else if (this.form.username.length > 255) this.addError('username', 'Username must be at most 255 characters')

            // email: required|string|email|max:255|unique:users
            if (!this.form.email || !this.form.email.toString().trim()) this.addError('email', 'Email is required')
            else if (this.form.email.length > 255) this.addError('email', 'Email must be at most 255 characters')
            else if (!/^\S+@\S+\.\S+$/.test(this.form.email)) this.addError('email', 'Email is not valid')
            else if (admins.some(a => a.email && a.email.toLowerCase() === this.form.email.toLowerCase())) this.addError('email', 'Email already exists')

            // employee_id: nullable|string|max:50|unique:users
            if (this.form.employee_id && this.form.employee_id.toString().length > 15) this.addError('employee_id', 'Employee ID must be at most 50 characters')
            else if (this.form.employee_id && admins.some(a => a.employee_id && a.employee_id.toString() === this.form.employee_id.toString())) this.addError('employee_id', 'Employee ID already exists')

            // password: required|string|min:8
            if (!this.form.password) this.addError('password', 'Password is required')
            else if (this.form.password.length < 8) this.addError('password', 'Password must be at least 8 characters')

            // first_name: required|string|max:100
            if (!this.form.first_name || !this.form.first_name.toString().trim()) this.addError('first_name', 'First name is required')
            else if (this.form.first_name.length > 100) this.addError('first_name', 'First name must be at most 100 characters')

            // last_name: required|string|max:100
            if (!this.form.last_name || !this.form.last_name.toString().trim()) this.addError('last_name', 'Last name is required')
            else if (this.form.last_name.length > 100) this.addError('last_name', 'Last name must be at most 100 characters')

            // middle_name: nullable|string|max:100
            if (this.form.middle_name && this.form.middle_name.length > 100) this.addError('middle_name', 'Middle name must be at most 100 characters')

            // suffix: nullable|string|max:50
            if (this.form.suffix && this.form.suffix.length > 50) this.addError('suffix', 'Suffix must be at most 50 characters')

            // role: required|in:super_admin,branch_admin,admin
            const allowedRoles = ['super_admin', 'branch_admin', 'admin']
            if (!this.form.role) this.addError('role', 'Role is required')
            else if (!allowedRoles.includes(this.form.role)) this.addError('role', 'Role is not valid')

            // branch_id: required|exists:branches,id -> we check presence and positive integer
            if (this.form.branch_id === null || this.form.branch_id === undefined) this.addError('branch_id', 'Branch is required')
            else if (!Number.isInteger(this.form.branch_id) && typeof this.form.branch_id !== 'number') this.addError('branch_id', 'Branch must be a number')

            // return validity
            return Object.keys(this.errors).every(k => !this.errors[k] || this.errors[k].length === 0)
        },
        onSubmit() {
            if (!this.validate()) {
                console.log('Validation failed', this.errors)
                return
            }

            const newAdmin = {
                employee_id: this.form.employee_id || null,
                email: this.form.email,
                username: this.form.username,
                password: this.form.password,
                first_name: this.form.first_name,
                last_name: this.form.last_name,
                middle_name: this.form.middle_name || null,
                suffix: this.form.suffix || null,
                role: this.form.role,
                branch_id: this.form.branch_id,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }

            console.log('New admin (client stub):', newAdmin)
            try { window.alert('Admin created (client stub) — check console for object') } catch (e) { /* noop */ }

            // reset form to initial values
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
            }
            this.errors = {}
        },
    },
}
</script>

<style scoped>
.v-card-title {
    font-weight: 600
}
</style>
