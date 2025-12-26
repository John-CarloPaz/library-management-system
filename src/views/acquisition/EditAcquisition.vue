<template>
    <AppBar title="Edit Acquisition">
        <template #title-actions>
            <v-btn text @click="cancel">Back</v-btn>
        </template>
    </AppBar>
    <v-container>
        <v-card elevation="1" class="py-3">
            <v-card-text>
                <v-progress-linear v-if="isLoading" indeterminate></v-progress-linear>

                <v-form ref="formRef" @submit.prevent="onSubmit" v-if="!isLoading">
                    <!-- Title and Author row -->
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.title" label="Title" :error-messages="errors.title"
                                required variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.author" label="Author" :error-messages="errors.author"
                                required variant="solo" />
                        </v-col>
                    </v-row>

                    <!-- Edition and ISBN row -->
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.edition" label="Edition" :error-messages="errors.edition"
                                variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.isbn" label="ISBN" :error-messages="errors.isbn"
                                variant="solo" />
                        </v-col>
                    </v-row>

                    <!-- Publisher and Year row -->
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.publisher" label="Publisher" :error-messages="errors.publisher"
                                variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field v-model.number="form.year_of_publication" label="Year of Publication"
                                type="number" :error-messages="errors.year_of_publication" required variant="solo" />
                        </v-col>
                    </v-row>

                    <!-- Place of Publication -->
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.place_of_publication" label="Place of Publication"
                                :error-messages="errors.place_of_publication" variant="solo" />
                        </v-col>
                    </v-row>

                    <!-- Branch Selection -->
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-select v-model="form.branch_id" :items="branches" item-title="name" item-value="id"
                                label="Branch" :error-messages="errors.branch_id" required variant="solo"
                                :loading="isLoadingBranches" />
                        </v-col>
                    </v-row>

                    <!-- Quantity Requested and Method row -->
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field v-model.number="form.quantity_requested" label="Quantity Requested"
                                type="number" :error-messages="errors.quantity_requested" required variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-select v-model="form.acquisition_method" :items="acquisitionMethods"
                                label="Acquisition Method" :error-messages="errors.acquisition_method" required
                                variant="solo" />
                        </v-col>
                    </v-row>

                    <!-- Supplier Name and Cost row -->
                    <v-row>
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
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.date_acquired" label="Date Acquired" type="date"
                                :error-messages="errors.date_acquired" variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-select v-model="form.acquisition_status" :items="acquisitionStatus"
                                label="Status" :error-messages="errors.acquisition_status" required variant="solo" />
                        </v-col>
                    </v-row>

                    <!-- Quantity Acquired -->
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field v-model.number="form.quantity_acquired" label="Quantity Acquired"
                                type="number" :error-messages="errors.quantity_acquired" variant="solo" />
                        </v-col>
                    </v-row>

                    <v-row>
                        <v-col class="d-flex justify-end">
                            <v-btn text @click="cancel" class="mr-3" :disabled="isSubmitting">Cancel</v-btn>
                            <v-btn color="primary" @click="onSubmit" :loading="isSubmitting" :disabled="isSubmitting">
                                Update
                            </v-btn>
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
import AppBar from '@/components/AppBar.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { getAcquisition, updateAcquisition, validateAcquisition } from '@/services/acquisition'
import { listActiveBranches } from '@/services/branch'
import { getSession } from '@/services/auth'

export default {
    name: 'edit-acquisition',
    components: { AppBar, ErrorDialog },
    props: {
        id: {
            type: [String, Number],
            required: true,
        },
    },
    data() {
        return {
            isLoading: false,
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
        if (this.id) {
            this.loadAcquisition()
        }
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
                    const branchId = Number(session.branch_id)
                    this.form.branch_id = branchId
                    console.log('Set default branch_id from session:', branchId, 'type:', typeof branchId)
                } else {
                    console.warn('No branch_id in session')
                }
                
                console.log('Branches loaded:', this.branches)
            } catch (error) {
                console.error('Failed to load branches:', error)
            } finally {
                this.isLoadingBranches = false
            }
        },
        async loadAcquisition() {
            this.isLoading = true
            try {
                const acq = await getAcquisition(this.id)
                this.form = {
                    title: acq.title || '',
                    author: acq.author || '',
                    edition: acq.edition || '',
                    isbn: acq.isbn || '',
                    publisher: acq.publisher || '',
                    place_of_publication: acq.place_of_publication || '',
                    year_of_publication: acq.year_of_publication || null,
                    quantity_requested: acq.quantity_requested || null,
                    acquisition_method: acq.acquisition_method || null,
                    supplier_name: acq.supplier_name || '',
                    cost: acq.cost || null,
                    date_acquired: acq.date_acquired || '',
                    quantity_acquired: acq.quantity_acquired || null,
                    acquisition_status: acq.acquisition_status || 'pending',
                    branch_id: acq.branch_id ? Number(acq.branch_id) : null,
                }
                console.log('Loaded acquisition with branch_id:', this.form.branch_id, 'type:', typeof this.form.branch_id)
                this.errors = {}
            } catch (error) {
                console.error('Failed to load acquisition:', error)
                this.dialog = {
                    visible: true,
                    title: 'Load Failed',
                    message: 'Failed to load acquisition: ' + (error.message || 'Unknown error'),
                    isError: true,
                }
                setTimeout(() => {
                    this.$router.push({ name: 'acquisition' })
                }, 2000)
            } finally {
                this.isLoading = false
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

                await updateAcquisition(this.id, data)
                console.log('Acquisition updated successfully')

                // Dispatch event so other components know to refresh
                try {
                    window.dispatchEvent(new CustomEvent('acquisition:updated'))
                } catch (e) { /* noop */ }

                // Navigate to view page
                setTimeout(() => {
                    this.$router.push({
                        name: 'view-acquisition',
                        params: { id: this.id },
                        query: { success: true }
                    })
                }, 500)
            } catch (error) {
                console.error('Failed to update acquisition:', error)
                if (typeof error.message === 'string' && error.message.includes(':')) {
                    const lines = error.message.split('\n')
                    lines.forEach(line => {
                        const [field, ...msg] = line.split(':')
                        if (field && msg) {
                            this.errors[field.trim()] = [msg.join(':').trim()]
                        }
                    })
                } else {
                    this.dialog = {
                        visible: true,
                        title: 'Update Failed',
                        message: `Error: ${error.message || 'Unknown error'}`,
                        isError: true,
                    }
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
