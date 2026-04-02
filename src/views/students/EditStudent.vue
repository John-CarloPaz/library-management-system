<template>
    <AppBar title="Edit Member">
        <template #title-actions>
            <v-btn text @click="goBack">Back</v-btn>
        </template>
    </AppBar>

    <v-container>
        <v-card elevation="0" class="py-3">
            <v-card-text>
                <v-form ref="form" @submit.prevent="submitForm">
                    <p class="text-subtitle-1 font-weight-semibold">Personal Information</p>
                    <v-divider class="border-opacity-25 mb-4"></v-divider>

                    <v-row class="mb-4" dense>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="form.first_name" label="First Name"
                                :rules="rules.firstName" variant="solo" class="mb-4" />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="form.middle_name" label="Middle Name" variant="solo" class="mb-4" />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="form.last_name" label="Last Name"
                                :rules="rules.lastName" variant="solo" class="mb-4" />
                        </v-col>
                    </v-row>

                    <v-row class="mb-4" dense>
                        <v-col cols="12" md="3">
                            <v-text-field v-model="form.suffix" label="Suffix" variant="solo" class="mb-4" />
                        </v-col>
                        <v-col cols="12" md="5">
                            <v-text-field v-model="form.email" label="Email" type="email"
                                :rules="rules.email" variant="solo" class="mb-4" />
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field v-model.number="form.student_id" type="number" label="Student ID"
                                :rules="rules.studentId" variant="solo" class="mb-4" />
                        </v-col>
                    </v-row>

                    <p class="text-subtitle-1 font-weight-semibold">Academic</p>
                    <v-divider class="border-opacity-25 mb-4"></v-divider>

                    <v-row class="mb-4" dense>
                        <v-col cols="12" md="4">
                            <v-autocomplete v-model="form.program" :items="programOptions" label="Program"
                                :rules="rules.program" variant="solo" class="mb-4" menu-icon="fas fa-chevron-down" clearable dense />
                        </v-col>
                        <v-col cols="12" md="3">
                            <v-text-field v-model.number="form.year_level" label="Year Level" type="number" min="1"
                                max="5" :rules="rules.yearLevel" append-inner-icon="fa-calendar"
                                variant="solo" class="mb-4" />
                        </v-col>
                        <v-col cols="12" md="3">
                            <v-select v-model="form.semester_id" :items="semesterOptions" item-title="label"
                                item-value="id" label="Semester" :rules="rules.semesterId"
                                variant="solo" class="mb-4" :loading="loadingSemesters" clearable required
                                hide-details="auto" menu-icon="fas fa-chevron-down" />
                        </v-col>
                        <v-col cols="12" md="2">
                            <v-select v-model="form.status" :items="statusOptions" item-title="title" item-value="value"
                                label="Status" :rules="rules.status" variant="solo" class="mb-4"
                                menu-icon="fas fa-chevron-down" />
                        </v-col>
                    </v-row>

                    <v-row>
                        <v-col class="d-flex justify-end">
                            <v-btn text @click="goBack" class="mr-3" :disabled="submitting">Cancel</v-btn>
                            <v-btn color="primary" type="submit" :loading="submitting">Update</v-btn>
                        </v-col>
                    </v-row>
                </v-form>
            </v-card-text>
        </v-card>
    </v-container>

    <ErrorDialog :visible.sync="dialog.visible" :title="dialog.title" :message="dialog.message"
        :isError="dialog.isError" @update:visible="dialog.visible = $event" />
</template>

<script>
import AppBar from '@/components/AppBar.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { getStudentByNumber, updateStudent } from '@/services/student'
import { listSemesters } from '@/services/semester'

export default {
    name: 'edit-student',
    components: { AppBar, ErrorDialog },
    props: {
        studentNumber: {
            type: [String, Number],
            required: true,
        },
    },
    data() {
        return {
            programOptions: [
                'MASTER OF SCIENCE IN NURSING MAJOR IN LEADERSHIP AND MANAGEMENT (ACADEMIC TRACK)',
                'MASTER OF SCIENCE IN NURSING MAJOR IN CLINICAL NURSING WITH SPECIALIZATION IN ADULT HEALTH (PROFESSIONAL TRACK)',
                'BACHELOR OF SCIENCE IN NURSING',
                'BACHELOR OF SCIENCE IN CRIMINOLOGY',
                'BACHELOR OF ARTS IN COMMUNICATION',
                'BACHELOR OF SCIENCE IN SOCIAL WORK',
                'BACHELOR OF SCIENCE IN ACCOUNTANCY',
                'BACHELOR OF SCIENCE IN BUSINESS ADMINISTRATION',
                'BACHELOR OF SCIENCE IN CUSTOMS ADMINISTRATION',
                'BACHELOR OF SCIENCE IN REAL ESTATE MANAGEMENT',
                'BACHELOR OF SCIENCE IN OFFICE ADMINISTRATION',
                'MASTERS IN INFORMATION TECHNOLOGY',
                'DOCTOR OF INFORMATION TECHNOLOGY',
                'BACHELOR OF SCIENCE IN COMPUTER SCIENCE',
                'BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY - MOBILE DEVELOPMENT',
                'BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY - NETWORK ADMINISTRATION',
                'BACHELOR OF SCIENCE IN ENTERTAINMENT AND MULTIMEDIA COMPUTING',
                'ASSOCIATE IN COMPUTER TECHNOLOGY',
                'BACHELOR OF ELEMENTARY EDUCATION',
                'BACHELOR OF SCIENCE IN PHYSICAL EDUCATION',
                'BACHELOR OF SECONDARY EDUCATION - MAJOR IN ENGLISH',
                'BACHELOR OF SECONDARY EDUCATION - MAJOR IN MATHEMATICS',
                'CERTIFICATE FOR TEACHING PROGRAM (18 UNITS)',
                'BACHELOR OF SCIENCE IN HOSPITALITY MANAGEMENT',
                'BACHELOR OF SCIENCE IN TOURISM MANAGEMENT',
                'BACHELOR OF SCIENCE IN COMPUTER ENGINEERING',
                'BACHELOR OF SCIENCE IN ELECTRONICS ENGINEERING',
                'BASIC EDUCATION',
                'EMPLOYEE',
            ],
            student: null,
            form: {
                first_name: '',
                middle_name: '',
                last_name: '',
                suffix: '',
                email: '',
                student_id: null,
                program: '',
                year_level: 1,
                status: 'active',
                semester_id: null,
            },
            rules: {
                firstName: [
                    v => !!String(v || '').trim() || 'First name is required',
                    v => String(v || '').length <= 255 || 'First name must be 255 characters or less',
                ],
                lastName: [
                    v => !!String(v || '').trim() || 'Last name is required',
                    v => String(v || '').length <= 255 || 'Last name must be 255 characters or less',
                ],
                email: [
                    v => !!String(v || '').trim() || 'Email is required',
                    v => /.+@.+\..+/.test(String(v || '').trim()) || 'Email must be valid',
                    v => String(v || '').length <= 255 || 'Email must be 255 characters or less',
                ],
                studentId: [
                    v => (v !== null && v !== undefined && String(v).trim() !== '') || 'Student ID is required',
                    v => Number.isInteger(Number(v)) || 'Student ID must be an integer',
                ],
                program: [
                    v => !!String(v || '').trim() || 'Program is required',
                    v => String(v || '').length <= 255 || 'Program must be 255 characters or less',
                ],
                yearLevel: [
                    v => (v !== null && v !== undefined && String(v).trim() !== '') || 'Year level is required',
                    v => Number.isInteger(Number(v)) || 'Year level must be an integer',
                    v => Number(v) >= 1 || 'Year level must be at least 1',
                    v => Number(v) <= 5 || 'Year level must be at most 5',
                ],
                semesterId: [
                    v => (v !== null && v !== undefined && String(v).trim() !== '') || 'Semester is required',
                ],
                status: [
                    v => !!String(v || '').trim() || 'Status is required',
                    v => ['active', 'inactive', 'suspended'].includes(String(v || '').toLowerCase()) || 'Status must be active, inactive, or suspended',
                ],
            },
            statusOptions: [
                { value: 'active', title: 'Active' },
                { value: 'inactive', title: 'Inactive' },
                { value: 'suspended', title: 'Suspended' },
            ],
            semesterOptions: [],
            loadingSemesters: false,
            submitting: false,
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: false,
            },
        }
    },
    created() {
        this.loadSemesters()
        this.loadStudent()
    },
    methods: {
        async loadSemesters() {
            this.loadingSemesters = true
            try {
                const semesters = await listSemesters()
                this.semesterOptions = Array.isArray(semesters)
                    ? semesters.map(s => ({
                        id: s.id,
                        label: `${s.name} (${s.start_date} - ${s.end_date})`,
                    }))
                    : []
            } catch (error) {
                console.error('Failed to load semesters:', error)
            } finally {
                this.loadingSemesters = false
            }
        },
        async loadStudent() {
            try {
                const s = await getStudentByNumber(this.studentNumber)
                this.student = s
                this.form = {
                    first_name: s.first_name,
                    middle_name: s.middle_name,
                    last_name: s.last_name,
                    suffix: s.suffix,
                    email: s.email,
                    student_id: s.student_id != null ? Number(s.student_id) : null,
                    program: s.program,
                    year_level: s.year_level,
                    status: s.status,
                    semester_id: s.semester_id || (s.semester ? s.semester.id : null),
                }
            } catch (error) {
                // Pass full error object so ErrorDialog can extract server message without status code noise
                this.showDialog('Load Failed', error, true)
                this.$router.push({ name: 'member-management' })
            }
        },
        async submitForm() {
            if (!this.$refs.form.validate()) return

            this.submitting = true
                try {
                const payload = { ...this.form, student_id: Number(this.form.student_id) }
                await updateStudent(this.studentNumber, payload)

                // After successful update, go to the student's view page (ensure numeric)
                const targetNumber = Number(this.form.student_id) || Number(this.studentNumber)
                this.$router.push({
                    name: 'view-student',
                    params: { studentNumber: targetNumber },
                    query: { success: 'true' },
                })
            } catch (error) {
                this.showDialog('Error', error, true)
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
