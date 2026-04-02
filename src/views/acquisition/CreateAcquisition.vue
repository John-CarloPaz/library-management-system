<template>
    <AppBar title="Create Acquisition">
        <template #title-actions>
            <v-btn text @click="cancel">Back</v-btn>
        </template>
    </AppBar>
    <v-container>
        <v-card elevation="0" class="py-3">
            <v-card-text>
                <v-form ref="formRef" @submit.prevent="onSubmit">
                    <p class="text-subtitle-1 font-weight-semibold">Book Information</p>
                    <v-divider class="border-opacity-25 mb-4"></v-divider>

                    <!-- Title and Author row -->
                    <v-row dense>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.title" label="Title" :error-messages="errors.title" required
                                variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.author" label="Author" :error-messages="errors.author" required
                                variant="solo" />
                        </v-col>
                    </v-row>

                    <!-- Edition and ISBN row -->
                    <v-row dense class="mb-4">
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.edition" label="Edition" :error-messages="errors.edition"
                                variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.isbn" label="ISBN" :error-messages="errors.isbn"
                                variant="solo" />
                        </v-col>
                    </v-row>

                    <p class="text-subtitle-1 font-weight-semibold">Publication Details</p>
                    <v-divider class="border-opacity-25 mb-4"></v-divider>

                    <!-- Publisher and Year row -->
                    <v-row class="mb-4" dense>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="form.publisher" label="Publisher" :error-messages="errors.publisher"
                                variant="solo" />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="form.place_of_publication" label="Place of Publication"
                                :error-messages="errors.place_of_publication" variant="solo" />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field v-model.number="form.year_of_publication" label="Year of Publication"
                                type="number" :error-messages="errors.year_of_publication" required variant="solo" />
                        </v-col>
                    </v-row>

                    <p class="text-subtitle-1 font-weight-semibold">Acquisition Details</p>
                    <v-divider class="border-opacity-25 mb-4"></v-divider>

                    <!-- Branch Selection -->

                    <!-- Quantity Requested and Method row -->
                    <v-row class="mb-4" dense>
                        <v-col cols="12" md="4">
                            <v-select v-model="form.branch_id" :items="branches" item-title="name" item-value="id"
                                label="Branch" :error-messages="errors.branch_id" required variant="solo"
                                :loading="isLoadingBranches" />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field v-model.number="form.quantity_requested" label="Quantity Requested"
                                type="number" :error-messages="errors.quantity_requested" required variant="solo" />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-select v-model="form.acquisition_method" :items="acquisitionMethods"
                                label="Acquisition Method" :error-messages="errors.acquisition_method" required
                                variant="solo" />
                        </v-col>
                    </v-row>

                    <p class="text-subtitle-1 font-weight-semibold">Supplier & Cost</p>
                    <v-divider class="border-opacity-25 mb-4"></v-divider>

                    <!-- Supplier Name and Cost row -->
                    <v-row class="mb-4" dense>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.supplier_name" label="Supplier Name"
                                :error-messages="errors.supplier_name" variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field v-model.number="form.cost" label="Cost" type="number"
                                :error-messages="errors.cost" variant="solo" />
                        </v-col>
                    </v-row>

                    <!-- Date Acquired and Status row -->
                    <v-row dense>
                        <v-col cols="12" md="3">
                            <v-text-field v-model.number="form.quantity_acquired" label="Quantity Acquired"
                                type="number" :error-messages="errors.quantity_acquired" variant="solo" />
                        </v-col>
                        <v-col cols="12" md="3">
                            <v-text-field v-model="form.date_acquired" label="Date Acquired" type="date"
                                :error-messages="errors.date_acquired" variant="solo" append-inner-icon="fa-calendar" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-select v-model="form.acquisition_status" :items="acquisitionStatus" label="Status"
                                :error-messages="errors.acquisition_status" required variant="solo" />
                        </v-col>
                    </v-row>

                </v-form>
            </v-card-text>
        </v-card>

        <v-row class="mt-4">
            <v-col class="d-flex justify-end">
                <v-btn text @click="cancel" class="mr-3" :disabled="isSubmitting">Cancel</v-btn>
                <v-btn color="primary" @click="onSubmit" :loading="isSubmitting" :disabled="isSubmitting">Create</v-btn>
            </v-col>
        </v-row>
    </v-container>

    <!-- Error Dialog -->
    <ErrorDialog :visible.sync="dialog.visible" :title="dialog.title" :message="dialog.message"
        :isError="dialog.isError" @update:visible="dialog.visible = $event" />
</template>

<script>
import AppBar from '@/components/AppBar.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { createAcquisition, validateAcquisition } from '@/services/acquisition'
import { listActiveBranches } from '@/services/branch'
import { getSession } from '@/services/auth'

export default {
    name: 'create-acquisition',
    components: { AppBar, ErrorDialog },
    data() {
        return {
            isSubmitting: false,
            isLoadingBranches: false,
            branches: [],
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: false,
            },
            acquisitionMethods: [
                { value: 'book_fair', title: 'Book Fair' },
                { value: 'supplier', title: 'Supplier' },
                { value: 'donation', title: 'Donation' },
            ],
            acquisitionStatus: [
                { value: 'pending', title: 'Pending' },
                { value: 'received', title: 'Received' },
                { value: 'partial', title: 'Partial' },
                { value: 'missing', title: 'Missing' },
                { value: 'cancelled', title: 'Cancelled' },
            ],
            form: {
                title: '',
                author: '',
                edition: '',
                isbn: '',
                publisher: '',
                place_of_publication: '',
                year_of_publication: null,
                quantity_requested: null,
                acquisition_method: null,
                supplier_name: '',
                cost: null,
                date_acquired: '',
                quantity_acquired: null,
                acquisition_status: 'pending',
                branch_id: null,
            },
            errors: {},
        }
    },
    mounted() {
        this.loadBranches()
    },
    methods: {
        async loadBranches() {
            this.isLoadingBranches = true
            try {
                this.branches = await listActiveBranches()
                console.log('Raw branches from API:', this.branches)

                const session = getSession()
                console.log('Current session:', session)

                if (session && session.branch_id) {
                    // Ensure branch_id is a number
                    const branchId = Number(session.branch_id)
                    this.form.branch_id = branchId
                    console.log('Set default branch_id from session:', branchId, 'type:', typeof branchId)
                } else {
                    console.warn('No branch_id in session')
                }

                console.log('Branches loaded:', this.branches)
                console.log('Form branch_id after load:', this.form.branch_id, 'type:', typeof this.form.branch_id)
            } catch (error) {
                console.error('Failed to load branches:', error)
                this.showDialog('Error', 'Failed to load branches: ' + error.message, true)
            } finally {
                this.isLoadingBranches = false
            }
        },
        cancel() {
            try { this.$router.back() } catch (e) { console.warn('Failed to navigate back', e) }
        },
        validate() {
            const { isValid, errors } = validateAcquisition(this.form)
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
                const data = {
                    title: this.form.title,
                    author: this.form.author,
                    edition: this.form.edition || null,
                    isbn: this.form.isbn || null,
                    publisher: this.form.publisher || null,
                    place_of_publication: this.form.place_of_publication || null,
                    year_of_publication: this.form.year_of_publication,
                    quantity_requested: this.form.quantity_requested,
                    acquisition_method: this.form.acquisition_method,
                    supplier_name: this.form.supplier_name || null,
                    cost: this.form.cost || null,
                    date_acquired: this.form.date_acquired || null,
                    quantity_acquired: this.form.quantity_acquired || null,
                    acquisition_status: this.form.acquisition_status,
                    branch_id: this.form.branch_id ? Number(this.form.branch_id) : null,
                }

                console.log('Submitting acquisition with branch_id:', data.branch_id, 'type:', typeof data.branch_id)
                console.log('Full payload:', data)

                const result = await createAcquisition(data)
                console.log('Acquisition created successfully:', result)

                // Dispatch event so other components know to refresh
                try {
                    window.dispatchEvent(new CustomEvent('acquisition:updated'))
                } catch (e) { /* noop */ }

                // Navigate to view page
                setTimeout(() => {
                    this.$router.push({
                        name: 'view-acquisition',
                        params: { id: result.id },
                        query: { success: true }
                    })
                }, 500)
            } catch (error) {
                console.error('Failed to create acquisition:', error)
                if (typeof error.message === 'string' && error.message.includes(':')) {
                    const lines = error.message.split('\n')
                    lines.forEach(line => {
                        const [field, ...msg] = line.split(':')
                        if (field && msg) {
                            this.errors[field.trim()] = [msg.join(':').trim()]
                        }
                    })
                } else {
                    this.showDialog('Create Failed', `Error: ${error.message || 'Unknown error'}`, true)
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
