<template>
    <AppBar title="Edit Procurement Request">
        <template #title-actions>
            <v-btn text @click="goBack">Cancel</v-btn>
        </template>
    </AppBar>

    <v-container>
        <v-card elevation="1" class="py-3" v-if="!isLoading">
            <v-card-text>
                <v-form ref="formRef" @submit.prevent="submitForm">
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="form.title"
                                label="Title"
                                placeholder="Enter book title"
                                :error-messages="errors.title ? [errors.title] : []"
                                @input="clearError('title')"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="form.author"
                                label="Author"
                                placeholder="Enter author name"
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
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field
                                v-model="form.place_of_publication"
                                label="Place of Publication"
                                placeholder="Enter place of publication"
                            ></v-text-field>
                        </v-col>
                    </v-row>

                    <v-row>
                        <v-col cols="12" md="4">
                            <v-text-field
                                v-model="form.edition"
                                label="Edition"
                                placeholder="e.g., 2nd Edition"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field
                                v-model="form.isbn"
                                label="ISBN"
                                placeholder="Enter ISBN"
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
                                min="1"
                                :error-messages="errors.quantity_requested ? [errors.quantity_requested] : []"
                                @input="clearError('quantity_requested')"
                            ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-select
                                v-model="form.admin_approval"
                                label="Approval Status"
                                :items="approvalStatuses"
                                item-title="text"
                                item-value="value"
                            ></v-select>
                        </v-col>
                    </v-row>

                    <v-divider class="my-4"></v-divider>

                    <v-row>
                        <v-col cols="12">
                            <v-btn color="primary" type="submit" :loading="loading">
                                Update Request
                            </v-btn>
                            <v-btn text @click="goBack" class="ml-2">Cancel</v-btn>
                        </v-col>
                    </v-row>
                </v-form>
            </v-card-text>
        </v-card>

        <v-card elevation="1" v-if="isLoading" class="py-3">
            <v-card-text>
                <v-progress-linear indeterminate></v-progress-linear>
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
import { getProcurement, updateProcurement, validateProcurement, getApprovalStatuses } from '@/services/procurement'
import { ACTIONS, can as canCheck } from '@/services/permission'

export default {
    name: 'edit-procurement',
    components: { AppBar, ErrorDialog },
    props: {
        id: {
            type: [String, Number],
            required: true,
        },
    },
    data() {
        return {
            isLoading: true,
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
                admin_approval: 'pending',
            },
            errors: {},
            approvalStatuses: getApprovalStatuses(),
        }
    },
    async created() {
        if (!canCheck(ACTIONS.EDIT)) {
            this.$router.replace({ name: 'procurement' })
            return
        }
        await this.loadProcurement()
    },
    methods: {
        async loadProcurement() {
            this.isLoading = true
            try {
                const procurement = await getProcurement(this.id, true)
                
                // Populate form with procurement data
                this.form = {
                    title: procurement.title || '',
                    author: procurement.author || '',
                    edition: procurement.edition || '',
                    isbn: procurement.isbn || '',
                    publisher: procurement.publisher || '',
                    place_of_publication: procurement.place_of_publication || '',
                    year_of_publication: procurement.year_of_publication || null,
                    quantity_requested: procurement.quantity_requested || null,
                    admin_approval: procurement.admin_approval || 'pending',
                }
            } catch (error) {
                console.error('Failed to load procurement:', error)
                this.showDialog('Load Failed', 'Failed to load procurement', true)
                this.$router.replace({ name: 'procurement' })
            } finally {
                this.isLoading = false
            }
        },
        async submitForm() {
            // Clear previous errors
            this.errors = {}

            // Validate form
            const validation = validateProcurement(this.form, 'edit')
            if (!validation.isValid) {
                this.errors = validation.errors
                this.showDialog('Validation Error', 'Please fix the errors and try again.', true)
                return
            }

            // Validate Vuetify form
            const isFormValid = await this.$refs.formRef.validate()
            if (!isFormValid) {
                this.showDialog('Validation Error', 'Please fill in the form correctly.', true)
                return
            }

            this.loading = true
            try {
                const result = await updateProcurement(this.id, this.form)
                
                // Trigger event for list refresh
                window.dispatchEvent(new Event('procurement:updated'))
                // Also refresh acquisition list (backend may have auto-created or updated an acquisition)
                window.dispatchEvent(new Event('acquisition:updated'))

                this.$router.push({ 
                    name: 'view-procurement', 
                    params: { id: result.id },
                    query: { success: 'true' }
                })
            } catch (error) {
                console.error('Failed to update procurement:', error.message)
                this.showDialog('Update Failed', 'Error: ' + (error.message || 'Unknown error'), true)
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
