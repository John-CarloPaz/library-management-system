<template>
    <AppBar title="Edit Catalogue">
        <template #title-actions>
            <v-btn text @click="cancel">Back</v-btn>
        </template>
    </AppBar>
    <v-container>
        <v-card elevation="0" class="py-3">
            <v-card-text>
                <v-progress-linear v-if="isLoading" indeterminate></v-progress-linear>

                <v-form ref="formRef" @submit.prevent="onSubmit" v-if="!isLoading">
                    <p class="text-subtitle-1 font-weight-semibold">Book Information</p>
                    <v-divider class="border-opacity-25 mb-4"></v-divider>

                    <!-- Acquisition ID and Number of Copies row -->
                    <v-row dense class="mb-4">
                        <v-col cols="12" md="6">
                            <v-text-field v-model.number="form.acquisition_id" label="Acquisition ID" type="number"
                                :error-messages="errors.acquisition_id" disabled required variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field v-model.number="form.number_of_copies" label="Number of Copies" type="number"
                                :error-messages="errors.number_of_copies" disabled required variant="solo" />
                        </v-col>
                    </v-row>

                    <p class="text-subtitle-1 font-weight-semibold">Classification</p>
                    <v-divider class="border-opacity-25 mb-4"></v-divider>

                    <!-- Dewey and Cutter Number row -->
                    <v-row dense class="mb-4">
                        <v-col cols="12" md="4">
                            <v-text-field v-model="form.dewey" label="Dewey Classification" type="text"
                                inputmode="numeric" @input="form.dewey = form.dewey.replace(/[^\d]/g, '')"
                                :disabled="isLocked" :error-messages="errors.dewey" variant="solo" />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="form.cutter_number" label="Cutter Number" type="text"
                                inputmode="numeric"
                                @input="form.cutter_number = form.cutter_number.replace(/[^\d]/g, '')"
                                :disabled="isLocked" :error-messages="errors.cutter_number" variant="solo" />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="form.call_number" label="Call Number" type="text" inputmode="numeric"
                                @input="form.call_number = form.call_number.replace(/[^\d]/g, '')" :disabled="isLocked"
                                :error-messages="errors.call_number" variant="solo" />
                        </v-col>
                    </v-row>


                    <p class="text-subtitle-1 font-weight-semibold">Publication Details</p>
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

                    <!-- Place, Publisher, Branch row -->
                    <v-row dense>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="form.place_of_publication" label="Place of Publication"
                                :error-messages="errors.place_of_publication" variant="solo" />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="form.publisher" label="Publisher" :error-messages="errors.publisher"
                                variant="solo" />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-select v-model="form.branch_id" :items="branches" item-title="name" item-value="id"
                                label="Branch" :error-messages="errors.branch_id" variant="solo" menu-icon="fas fa-chevron-down" />
                        </v-col>
                    </v-row>

                    <!-- Edition, ISBN, Year row -->
                    <v-row dense class="mb-4">
                        <v-col cols="12" md="4">
                            <v-text-field v-model="form.edition" label="Edition" :error-messages="errors.edition"
                                variant="solo" />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="form.isbn" label="ISBN" :error-messages="errors.isbn"
                                variant="solo" />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field v-model.number="form.year_of_publication" label="Year of Publication"
                                type="number" :error-messages="errors.year_of_publication" variant="solo" />
                        </v-col>
                    </v-row>

                    <v-row>
                        <v-col cols="12">
                            <v-select v-model="form.cataloging_status" :items="catalogingStatuses"
                                label="Cataloging Status" :error-messages="errors.cataloging_status"
                                :disabled="isLocked" :readonly="isLocked" required variant="solo" menu-icon="fas fa-chevron-down" />
                        </v-col>
                    </v-row>
                </v-form>
            </v-card-text>
        </v-card>
        <v-row class="mt-4">
            <v-col class="d-flex justify-end">
                <v-btn text @click="cancel" class="mr-3" :disabled="isSubmitting">Cancel</v-btn>
                <v-btn color="primary" @click="onSubmit" :loading="isSubmitting" :disabled="isSubmitting">Update</v-btn>
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
import { getCatalogue, updateCatalogue, validateCatalogue } from '@/services/catalogue'
import { listActiveBranchesCached } from '@/services/branch'
import { getSession } from '@/services/auth'

export default {
    name: 'edit-catalogue',
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
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: false,
            },
            catalogingStatuses: [
                { value: 'pending', title: 'Pending' },
                { value: 'in_progress', title: 'In Progress' },
                { value: 'cataloged', title: 'Cataloged' },
                { value: 'ready_for_labeling', title: 'Ready for Labeling' },
                { value: 'available', title: 'Available' },
                { value: 'on_hold', title: 'On Hold' },
            ],
            originalStatus: 'pending',
            isLocked: false,
            form: {
                acquisition_id: null,
                number_of_copies: null,
                branch_id: null,
                dewey: '',
                cutter_number: '',
                call_number: '',
                title: '',
                author: '',
                edition: '',
                isbn: '',
                publisher: '',
                place_of_publication: '',
                year_of_publication: null,
                cataloging_status: 'pending',
            },
            branches: [],
            errors: {},
        }
    },
    mounted() {
        if (this.id) {
            this.loadCatalogue()
        }
        // load branches and set default branch from session if applicable
        ;(async () => {
            try {
                const session = getSession()
                if (session && session.role !== 'super_admin' && session.branch_id) {
                    const bid = Number(session.branch_id)
                    this.form.branch_id = Number.isFinite(bid) ? bid : session.branch_id
                }
            } catch (e) { /* noop */ }

            try {
                this.branches = await listActiveBranchesCached()
            } catch (e) {
                this.branches = []
            }
        })()
    },
    methods: {
        async loadCatalogue() {
            this.isLoading = true
            try {
                const cat = await getCatalogue(this.id)
                const normalizedStatus = (cat.cataloging_status || 'pending').toString().trim().toLowerCase()
                this.form = {
                    acquisition_id: cat.acquisition_id || null,
                    number_of_copies: cat.number_of_copies || null,
                    branch_id: cat.branch_id ? Number(cat.branch_id) : null,
                    dewey: cat.dewey || '',
                    cutter_number: cat.cutter_number || '',
                    call_number: cat.call_number || '',
                    title: cat.title || '',
                    author: cat.author || '',
                    edition: cat.edition || '',
                    isbn: cat.isbn || '',
                    publisher: cat.publisher || '',
                    place_of_publication: cat.place_of_publication || '',
                    year_of_publication: cat.year_of_publication || null,
                    cataloging_status: normalizedStatus,
                }
                this.originalStatus = normalizedStatus
                this.isLocked = this.originalStatus === 'available'
                this.errors = {}
            } catch (error) {
                console.error('Failed to load catalogue:', error)
                this.dialog = {
                    visible: true,
                    title: 'Load Failed',
                    message: 'Failed to load catalogue: ' + (error.message || 'Unknown error'),
                    isError: true,
                }
                setTimeout(() => {
                    this.$router.push({ name: 'catalogue' })
                }, 2000)
            } finally {
                this.isLoading = false
            }
        },
        cancel() {
            try { this.$router.back() } catch (e) { console.warn('Failed to navigate back', e) }
        },
        validate() {
            const { isValid, errors } = validateCatalogue(this.form, 'edit')
            this.errors = errors
            return isValid
        },
        async onSubmit() {
            // Validate using Vuetify form validation first
            if (this.$refs.formRef && this.$refs.formRef.validate) {
                const { valid } = await this.$refs.formRef.validate()
                if (!valid) {
                    this.dialog = {
                        visible: true,
                        title: 'Validation Error',
                        message: 'Please fill in all required fields correctly.',
                        isError: true,
                    }
                    return
                }
            }

            if (!this.validate()) {
                this.dialog = {
                    visible: true,
                    title: 'Validation Error',
                    message: 'Some fields are invalid. Please review the highlighted fields.',
                    isError: true,
                }
                return
            }

            this.isSubmitting = true

            try {
                const data = {
                    acquisition_id: this.form.acquisition_id,
                    number_of_copies: this.form.number_of_copies,
                    branch_id: this.form.branch_id ? Number(this.form.branch_id) : null,
                    dewey: this.form.dewey || null,
                    cutter_number: this.form.cutter_number || null,
                    call_number: this.form.call_number || null,
                    title: this.form.title,
                    author: this.form.author,
                    edition: this.form.edition || null,
                    isbn: this.form.isbn || null,
                    publisher: this.form.publisher || null,
                    place_of_publication: this.form.place_of_publication || null,
                    year_of_publication: this.form.year_of_publication || null,
                    cataloging_status: this.form.cataloging_status,
                }

                // Confirmation when changing status to AVAILABLE (immutable book copies)
                if (this.form.cataloging_status === 'available') {
                    const confirmed = window.confirm('Are you sure you want to make this book available? This will create per book copies and those records will be immutable.')
                    if (!confirmed) {
                        this.isSubmitting = false
                        return
                    }
                }

                await updateCatalogue(this.id, data)
                console.log('Catalogue updated successfully')

                // Dispatch event so other components know to refresh
                try {
                    window.dispatchEvent(new CustomEvent('catalogue:updated'))
                } catch (e) { /* noop */ }

                // Navigate to view page
                setTimeout(() => {
                    this.$router.push({
                        name: 'view-catalogue',
                        params: { id: this.id },
                        query: { success: true }
                    })
                }, 500)
            } catch (error) {
                console.error('Failed to update catalogue:', error)
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
        showDialog(title, message, isError = false) {
            this.dialog = { visible: true, title, message, isError }
        },
    },
}
</script>
