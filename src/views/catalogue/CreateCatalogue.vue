<template>
    <AppBar title="Create Catalogue">
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

                    <!-- Title and Author row -->
                    <v-row dense>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.title" label="Title" 
                                :error-messages="errors.title"
                                required variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.author" label="Author" 
                                :error-messages="errors.author"
                                required variant="solo" />
                        </v-col>
                    </v-row>

                    <!-- Edition and ISBN row -->
                    <v-row dense class="mb-4">
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.edition" label="Edition" 
                                :error-messages="errors.edition" required variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.isbn" label="ISBN" 
                                :error-messages="errors.isbn" required variant="solo" />
                        </v-col>
                    </v-row>

                    <p class="text-subtitle-1 font-weight-semibold">Publication Details</p>
                    <v-divider class="border-opacity-25 mb-4"></v-divider>

                    <!-- Publisher and Year row -->
                    <v-row dense>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.publisher" label="Publisher" 
                                :error-messages="errors.publisher" required variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field v-model.number="form.year_of_publication" label="Year of Publication" 
                                type="number" :error-messages="errors.year_of_publication" required variant="solo" />
                        </v-col>
                    </v-row>

                    <!-- Place of Publication -->
                    <v-row dense class="mb-4">
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.place_of_publication" label="Place of Publication" 
                                :error-messages="errors.place_of_publication" required variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-select v-model="form.branch_id" :items="branches" item-title="name" item-value="id"
                                label="Branch" :error-messages="errors.branch_id" required variant="solo" menu-icon="fas fa-chevron-down" />
                        </v-col>
                    </v-row>

                    <p class="text-subtitle-1 font-weight-semibold">Classification</p>
                    <v-divider class="border-opacity-25 mb-4"></v-divider>

                    <!-- Dewey and Cutter Number row -->
                    <v-row dense class="mb-4">
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.dewey" label="Dewey Classification" 
                                type="text" inputmode="numeric" @input="form.dewey = form.dewey.replace(/[^\d]/g, '')"
                                :error-messages="errors.dewey" required variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.cutter_number" label="Cutter Number" 
                                type="text" inputmode="numeric" @input="form.cutter_number = form.cutter_number.replace(/[^\d]/g, '')"
                                :error-messages="errors.cutter_number" required variant="solo" />
                        </v-col>
                    </v-row>

                    <p class="text-subtitle-1 font-weight-semibold">Call Number & Copies</p>
                    <v-divider class="border-opacity-25 mb-4"></v-divider>

                    <!-- Call Number -->
                    <v-row dense class="mb-4">
                        <v-col cols="12" md="6">
                            <v-text-field v-model="form.call_number" label="Call Number" 
                                type="text" inputmode="numeric" @input="form.call_number = form.call_number.replace(/[^\d]/g, '')"
                                :error-messages="errors.call_number" required variant="solo" />
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field v-model.number="form.number_of_copies" label="Number of Copies" 
                                type="number" :error-messages="errors.number_of_copies"
                                required variant="solo" />
                        </v-col>
                    </v-row>


                    <p class="text-subtitle-1 font-weight-semibold">Cataloging Status</p>
                    <v-divider class="border-opacity-25 mb-4"></v-divider>

                    <!-- Cataloging Status -->
                    <v-row dense>
                        <v-col cols="12" md="12">
                            <v-select v-model="form.cataloging_status" :items="catalogingStatuses"
                                label="Cataloging Status" :error-messages="errors.cataloging_status" 
                                required variant="solo" menu-icon="fas fa-chevron-down" />
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
import { createCatalogue, validateCatalogue } from '@/services/catalogue'
import { listActiveBranchesCached } from '@/services/branch'
import { getSession } from '@/services/auth'

export default {
    name: 'create-catalogue',
    components: { AppBar, ErrorDialog },
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
            form: {
                number_of_copies: null,
                dewey: '',
                cutter_number: '',
                call_number: '',
                branch_id: null,
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
    async mounted() {
        try {
            const session = getSession()
            if (session && session.role !== 'super_admin' && session.branch_id) {
                const bid = Number(session.branch_id)
                this.form.branch_id = Number.isFinite(bid) ? bid : session.branch_id
            }
        } catch (e) { /* ignore */ }

        try {
            this.branches = await listActiveBranchesCached()
        } catch (e) {
            this.branches = []
        }
    },
    methods: {
        cancel() {
            try { this.$router.back() } catch (e) { console.warn('Failed to navigate back', e) }
        },
        validate() {
            const { isValid, errors } = validateCatalogue(this.form, 'create')
            this.errors = errors
            return isValid
        },
        async onSubmit() {
            // Validate using Vuetify form validation first
            const { valid } = await this.$refs.formRef.validate()
            
            if (!valid) {
                console.log('Form validation failed - empty required fields')
                this.showDialog('Validation Error', 'Please fill in all required fields correctly.', true)
                return
            }

            // Then validate using backend rules
            if (!this.validate()) {
                console.log('Backend validation failed', this.errors)
                this.showDialog('Validation Error', 'Some fields are invalid. Please review the highlighted fields.', true)
                return
            }

            // Confirmation when making catalogue AVAILABLE (will create immutable book copies)
            if (this.form.cataloging_status === 'available') {
                const confirmed = window.confirm('Are you sure you want to make this book available? This will create per book copies and those records will be immutable.')
                if (!confirmed) {
                    return
                }
            }

            this.isSubmitting = true

            try {
                const data = {
                    number_of_copies: this.form.number_of_copies,
                    dewey: this.form.dewey || null,
                    cutter_number: this.form.cutter_number || null,
                    call_number: this.form.call_number || null,
                    branch_id: this.form.branch_id ? Number(this.form.branch_id) : null,
                    title: this.form.title,
                    author: this.form.author,
                    edition: this.form.edition || null,
                    isbn: this.form.isbn || null,
                    publisher: this.form.publisher || null,
                    place_of_publication: this.form.place_of_publication || null,
                    year_of_publication: this.form.year_of_publication || null,
                    cataloging_status: this.form.cataloging_status,
                }

                const result = await createCatalogue(data)
                console.log('Catalogue created successfully')

                // Dispatch event so other components know to refresh
                try {
                    window.dispatchEvent(new CustomEvent('catalogue:updated'))
                } catch (e) { /* noop */ }

                // Navigate to view page
                setTimeout(() => {
                    this.$router.push({
                        name: 'view-catalogue',
                        params: { id: result.id },
                        query: { success: true }
                    })
                }, 500)
            } catch (error) {
                console.error('Failed to create catalogue:', error)
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
        
        showDialog(title, message, isError = false) {
            this.dialog = { visible: true, title, message, isError }
        },
    },
}
</script>
