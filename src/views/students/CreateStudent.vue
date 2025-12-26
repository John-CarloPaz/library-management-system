<template>
    <AppBar title="Create Student">
        <template #button-actions>
            <v-btn variant="tonal" @click="goBack">Back</v-btn>
        </template>
    </AppBar>

    <v-container class="mt-8">
        <v-row justify="center">
            <v-col cols="12" md="8">
                <v-card>
                    <v-card-title>New Student</v-card-title>
                    <v-card-text>
                        <v-form ref="form" @submit.prevent="submitForm">
                            <v-row>
                                <v-col cols="12" md="4">
                                    <v-text-field v-model="form.first_name" label="First Name" variant="outlined" density="compact" class="mb-4" :rules="[v => !!v || 'First name is required']" />
                                </v-col>
                                <v-col cols="12" md="4">
                                    <v-text-field v-model="form.middle_name" label="Middle Name" variant="outlined" density="compact" class="mb-4" />
                                </v-col>
                                <v-col cols="12" md="4">
                                    <v-text-field v-model="form.last_name" label="Last Name" variant="outlined" density="compact" class="mb-4" :rules="[v => !!v || 'Last name is required']" />
                                </v-col>
                            </v-row>

                            <v-row>
                                <v-col cols="12" md="3">
                                    <v-text-field v-model="form.suffix" label="Suffix" variant="outlined" density="compact" class="mb-4" />
                                </v-col>
                                <v-col cols="12" md="5">
                                    <v-text-field v-model="form.email" label="Email" type="email" variant="outlined" density="compact" class="mb-4" :rules="[v => !!v || 'Email is required']" />
                                </v-col>
                                <v-col cols="12" md="4">
                                    <v-text-field
                                        v-model="form.student_id"
                                        label="Student ID"
                                        variant="outlined"
                                        density="compact"
                                        class="mb-4"
                                        :rules="[v => !!v || 'Student ID is required']"
                                    />
                                </v-col>
                            </v-row>

                            <v-row>
                                <v-col cols="12" md="6">
                                    <v-text-field v-model="form.program" label="Program" variant="outlined" density="compact" class="mb-4" :rules="[v => !!v || 'Program is required']" />
                                </v-col>
                                <v-col cols="12" md="3">
                                    <v-text-field v-model.number="form.year_level" label="Year Level" type="number" min="1" max="5" variant="outlined" density="compact" class="mb-4" :rules="[v => !!v || 'Year level is required']" />
                                </v-col>
                                <v-col cols="12" md="3">
                                    <v-select
                                        v-model="form.status"
                                        :items="statusOptions"
                                        item-title="title"
                                        item-value="value"
                                        label="Status"
                                        variant="outlined"
                                        density="compact"
                                        class="mb-4"
                                        :rules="[v => !!v || 'Status is required']"
                                    />
                                </v-col>
                            </v-row>

                            <div class="d-flex gap-2">
                                <v-btn color="primary" type="submit" :loading="submitting">
                                    Create Student
                                </v-btn>
                                <v-btn variant="outlined" @click="goBack">Cancel</v-btn>
                            </div>
                        </v-form>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>

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
import { createStudent } from '@/services/student'

export default {
    name: 'create-student',
    components: { AppBar, ErrorDialog },
    data() {
        return {
            form: {
                first_name: '',
                middle_name: '',
                last_name: '',
                suffix: '',
                email: '',
                student_id: '',
                program: '',
                year_level: 1,
                status: 'active',
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
    methods: {
        async submitForm() {
            if (!this.$refs.form.validate()) return

            this.submitting = true
            try {
                await createStudent(this.form)
                this.$router.push({ name: 'student-management' })
            } catch (error) {
                const message = error.response?.data?.message || error.message || 'Failed to create student'
                this.showDialog('Error', message, true)
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
