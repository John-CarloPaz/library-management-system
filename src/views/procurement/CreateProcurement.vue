<template>
    <AppBar title="Create Procurement Request">
        <template #title-actions>
            <v-btn text @click="goBack">Cancel</v-btn>
        </template>
    </AppBar>

    <v-container>
        <v-card elevation="1" class="py-3">
            <v-card-text>
                <v-form ref="formRef" @submit.prevent="submitForm">
                    <p class="text-subtitle-1 font-weight-semibold">Book Information</p>
                    <v-divider class="border-opacity-25 mb-4"></v-divider>

                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="form.title"
                                label="Title"
                                placeholder="Enter book title"
                                required
                                variant="solo"
                                :error-messages="errors.title ? [errors.title] : []"
                                @input="clearError('title')"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="form.author"
                                label="Author"
                                placeholder="Enter author name"
                                required
                                variant="solo"
                                :error-messages="errors.author ? [errors.author] : []"
                                @input="clearError('author')"
                            ></v-text-field>
                        </v-col>
                    </v-row>

                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="form.publisher"
                                label="Publisher"
                                placeholder="Enter publisher name"
                                variant="solo"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="form.place_of_publication"
                                label="Place of Publication"
                                placeholder="Enter place of publication"
                                variant="solo"
                            ></v-text-field>
                        </v-col>
                    </v-row>

                    <p class="text-subtitle-1 font-weight-semibold">Publication Details</p>
                    <v-divider class="border-opacity-25 mb-4"></v-divider>

                    <v-row>
                        <v-col cols="12" md="4">
                            <v-text-field
                                v-model="form.edition"
                                label="Edition"
                                placeholder="e.g., 2nd Edition"
                                variant="solo"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field
                                v-model="form.isbn"
                                label="ISBN"
                                placeholder="Enter ISBN"
                                variant="solo"
                                :error-messages="errors.isbn ? [errors.isbn] : []"
                                @input="clearError('isbn')"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field
                                v-model.number="form.year_of_publication"
                                label="Year of Publication"
                                type="number"
                                placeholder="YYYY"
                                required
                                variant="solo"
                                :error-messages="errors.year_of_publication ? [errors.year_of_publication] : []"
                                @input="clearError('year_of_publication')"
                            ></v-text-field>
                        </v-col>
                    </v-row>

                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model.number="form.quantity_requested"
                                label="Quantity Requested"
                                type="number"
                                placeholder="Enter quantity"
                                required
                                min="1"
                                variant="solo"
                                :error-messages="errors.quantity_requested ? [errors.quantity_requested] : []"
                                @input="clearError('quantity_requested')"
                            ></v-text-field>
                        </v-col>
                    </v-row>
                </v-form>
            </v-card-text>
        </v-card>

        <v-row class="mt-4">
            <v-col class="d-flex justify-end">
                <v-btn text @click="goBack" class="mr-3">Cancel</v-btn>
                <v-btn color="primary" type="submit" :loading="loading" @click="submitForm">Create Request</v-btn>
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
import { createProcurement, validateProcurement } from '@/services/procurement'
import { ACTIONS, can as canCheck } from '@/services/permission'

export default {
    name: 'create-procurement',
    components: { AppBar, ErrorDialog },
    data() {
        return {
            loading: false,
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: false,
            },
            form: {
                title: '',
                author: '',
                edition: '',
                isbn: '',
                publisher: '',
                place_of_publication: '',
                year_of_publication: null,
                quantity_requested: null,
            },
            errors: {},
        }
    },
    created() {
        if (!canCheck(ACTIONS.CREATE)) {
            this.$router.replace({ name: 'procurement' })
        }
    },
    methods: {
        async submitForm() {
            // Clear previous errors
            this.errors = {}

            // Validate form
            const validation = validateProcurement(this.form, 'create')
            if (!validation.isValid) {
                this.errors = validation.errors
                this.showDialog('Validation Error', 'Please fill in all required fields.', true)
                return
            }

            // Validate Vuetify form
            const isFormValid = await this.$refs.formRef.validate()
            if (!isFormValid) {
                this.showDialog('Validation Error', 'Please fill in all required fields correctly.', true)
                return
            }

            this.loading = true
            try {
                const result = await createProcurement(this.form)
                
                // Trigger event for list refresh
                window.dispatchEvent(new Event('procurement:updated'))
                // Also refresh acquisition list (backend may have auto-created an acquisition)
                window.dispatchEvent(new Event('acquisition:updated'))

                this.$router.push({ 
                    name: 'view-procurement', 
                    params: { id: result.id },
                    query: { success: 'true' }
                })
            } catch (error) {
                console.error('Failed to create procurement:', error.message)
                this.showDialog('Create Failed', 'Error: ' + (error.message || 'Unknown error'), true)
            } finally {
                this.loading = false
            }
        },
        clearError(field) {
            if (this.errors[field]) {
                delete this.errors[field]
            }
        },
        goBack() {
            this.$router.back()
        },
        showDialog(title, message, isError = false) {
            this.dialog = { visible: true, title, message, isError }
        },
    },
}
</script>
