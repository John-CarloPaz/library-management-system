<template>
    <v-container>
        <v-row>
            <v-col class="mt-8">
                <AppBar title="Student Management">
                    <template #search-actions>
                        <v-text-field
                            v-model="filters.search"
                            density="compact"
                            label="Search"
                            variant="solo-filled"
                            hide-details="auto"
                            @input="applyFilters"
                            style="max-width: 360px;"
                        />
                    </template>
                </AppBar>

                <ScopeTab
                    v-model="scope"
                    :scopes="studentScopes"
                    class="mt-4 mb-2"
                />

                <FilterDrawer
                    v-model="filters"
                    :filters="['search', 'status']"
                    :statusOptions="statusOptions"
                    @update:modelValue="applyFilters"
                />

                <div class="d-flex justify-end mb-3">
                    <v-btn color="primary" @click="openCreateDialog">
                        <v-icon left icon="fa-plus"></v-icon>
                        New Student
                    </v-btn>
                </div>

                <Table
                    :headers="headers"
                    :items="filteredStudents"
                    :loading="loading"
                    item-key="id"
                >
                    <template #actions="{ item }">
                        <v-btn icon="fa-pen" size="x-small" variant="plain" @click.stop="openEditDialog(item)"></v-btn>
                        <v-btn
                            v-if="!item.is_archived"
                            icon="fa-box-archive"
                            size="x-small"
                            variant="plain"
                            @click.stop="confirmArchive(item)"
                        ></v-btn>
                        <v-btn
                            v-else
                            icon="fa-rotate-left"
                            size="x-small"
                            variant="plain"
                            @click.stop="confirmRestore(item)"
                        ></v-btn>
                    </template>
                </Table>
            </v-col>
        </v-row>

        <!-- Error Dialog -->
        <ErrorDialog
            :visible.sync="dialog.visible"
            :title="dialog.title"
            :message="dialog.message"
            :isError="dialog.isError"
            @update:visible="dialog.visible = $event"
        />

        <!-- Create / Edit Student Dialog -->
        <v-dialog v-model="editDialogVisible" max-width="700px">
            <v-card>
                <v-card-title class="text-h6">{{ isEditing ? 'Edit Student' : 'New Student' }}</v-card-title>
                <v-card-text>
                    <v-row>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="form.first_name" label="First Name" required></v-text-field>
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="form.middle_name" label="Middle Name"></v-text-field>
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field v-model="form.last_name" label="Last Name" required></v-text-field>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col cols="12" md="3">
                            <v-text-field v-model="form.suffix" label="Suffix"></v-text-field>
                        </v-col>
                        <v-col cols="12" md="5">
                            <v-text-field v-model="form.email" label="Email" type="email" required></v-text-field>
                        </v-col>
                        <v-col cols="12" md="4">
                            <v-text-field v-model.number="form.student_number" label="Student Number" type="number" required></v-text-field>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col cols="12" md="6">
                            <v-autocomplete v-model="form.program" :items="programOptions" label="Program" required clearable dense />
                        </v-col>
                        <v-col cols="12" md="3">
                            <v-text-field v-model.number="form.year_level" label="Year Level" type="number" min="1" max="5" required append-inner-icon="fa-calendar"></v-text-field>
                        </v-col>
                        <v-col cols="12" md="3">
                            <v-select
                                v-model="form.status"
                                :items="statusOptions"
                                item-title="title"
                                item-value="value"
                                label="Status"
                                required
                            ></v-select>
                        </v-col>
                    </v-row>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn variant="text" @click="closeDialog" :disabled="saving">Cancel</v-btn>
                    <v-btn color="primary" variant="flat" @click="saveStudent" :loading="saving">
                        {{ isEditing ? 'Save Changes' : 'Create Student' }}
                    </v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-container>
</template>

<script>
import AppBar from '../components/AppBar.vue'
import Table from '../components/Table.vue'
import FilterDrawer from '../components/FilterDrawer.vue'
import ErrorDialog from '../components/ErrorDialog.vue'
import ScopeTab from '@/components/ScopeTab.vue'
import {
    listStudentsFiltered,
    createStudent,
    updateStudent,
    archiveStudent,
    restoreStudent,
} from '@/services/student'

export default {
    name: 'StudentManagement',
    components: {
        AppBar,
        Table,
        FilterDrawer,
        ErrorDialog,
        ScopeTab,
    },
    data() {
        return {
            programOptions: [
                'MASTER OF SCIENCE IN NURSING',
                'MAJOR IN LEADERSHIP AND MANAGEMENT (ACADEMIC TRACK)',
                'MAJOR IN CLINICAL NURSING WITH SPECIALIZATION IN ADULT HEALTH (PROFESSIONAL TRACK)',
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
            loading: false,
            scope: 'active',
            students: [],
            filteredStudents: [],
            filters: {
                search: '',
                status: [],
            },
            statusOptions: [
                { value: 'active', title: 'Active' },
                { value: 'inactive', title: 'Inactive' },
                { value: 'suspended', title: 'Suspended' },
            ],
            studentScopes: [
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'archived', label: 'Archived' },
            ],
            headers: [
                { text: 'ID', value: 'id' },
                { text: 'Name', value: 'name' },
                { text: 'Email', value: 'email' },
                { text: 'Student Number', value: 'student_number' },
                { text: 'Program', value: 'program' },
                { text: 'Year Level', value: 'year_level' },
                { text: 'Status', value: 'status' },
                { text: 'Actions', value: 'actions', sortable: false },
            ],
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: false,
            },
            editDialogVisible: false,
            isEditing: false,
            saving: false,
            currentStudentNumber: null,
            form: {
                first_name: '',
                middle_name: '',
                last_name: '',
                suffix: '',
                email: '',
                student_number: null,
                program: '',
                year_level: 1,
                status: 'active',
            },
        }
    },
    mounted() {
        this.loadStudents()
    },
    watch: {
        scope() {
            // Reload students from backend when scope changes
            this.loadStudents()
        },
    },
    methods: {
        async loadStudents() {
            this.loading = true
            try {
                const scopeFilters = this.getScopeFilters()
                const data = await listStudentsFiltered({ ...scopeFilters, count: 'all' })

                const normalize = (s) => ({
                    ...s,
                    // Ensure we always have a usable student_number for routes and archive
                    student_number: s.student_number ?? s.student_id ?? s.id,
                    name: [s.first_name, s.middle_name, s.last_name, s.suffix].filter(Boolean).join(' '),
                })

                this.students = Array.isArray(data) ? data.map(s => normalize(s)) : []

                this.applyFilters()
            } catch (error) {
                console.error('Failed to load students:', error)
                this.showDialog('Load Error', error.message || 'Failed to load students', true)
            } finally {
                this.loading = false
            }
        },
        /**
         * Map current scope to backend filters for students.
         */
        getScopeFilters() {
            if (this.scope === 'all') {
                return { status: null, archived: 'false' }
            }
            if (this.scope === 'archived') {
                return { archived: 'true' }
            }
            // For active/inactive/suspended use status filter on non-archived records
            if (this.scope === 'active' || this.scope === 'inactive' || this.scope === 'suspended') {
                return { status: this.scope, archived: 'false' }
            }
            return {}
        },
        applyFilters() {
            let items = this.students.slice()

            if (this.filters.search) {
                const q = this.filters.search.toLowerCase()
                items = items.filter(s =>
                    (s.name && s.name.toLowerCase().includes(q)) ||
                    (s.email && s.email.toLowerCase().includes(q)) ||
                    (s.student_number && String(s.student_number).includes(q))
                )
            }

            if (this.filters.status && this.filters.status.length > 0) {
                items = items.filter(s => this.filters.status.includes(s.status))
            }

            this.filteredStudents = items
        },
        showDialog(title, message, isError = false) {
            this.dialog = { visible: true, title, message, isError }
        },
        openCreateDialog() {
            this.isEditing = false
            this.currentStudentNumber = null
            this.form = {
                first_name: '',
                middle_name: '',
                last_name: '',
                suffix: '',
                email: '',
                student_number: null,
                program: '',
                year_level: 1,
                status: 'active',
            }
            this.editDialogVisible = true
        },
        openEditDialog(item) {
            this.isEditing = true
            this.currentStudentNumber = item.student_number
            this.form = {
                first_name: item.first_name,
                middle_name: item.middle_name,
                last_name: item.last_name,
                suffix: item.suffix,
                email: item.email,
                student_number: item.student_number,
                program: item.program,
                year_level: item.year_level,
                status: item.status,
            }
            this.editDialogVisible = true
        },
        closeDialog() {
            this.editDialogVisible = false
            this.currentStudentNumber = null
        },
        async saveStudent() {
            this.saving = true
            try {
                if (this.isEditing && this.currentStudentNumber != null) {
                    await updateStudent(this.currentStudentNumber, this.form)
                    this.showDialog('Success', 'Student updated successfully')
                } else {
                    await createStudent(this.form)
                    this.showDialog('Success', 'Student created successfully')
                }
                this.closeDialog()
                this.loadStudents()
            } catch (error) {
                console.error('Failed to save student:', error)
                const message = error.response?.data?.message || error.message || 'Failed to save student'
                this.showDialog('Save Error', message, true)
            } finally {
                this.saving = false
            }
        },
        async confirmArchive(item) {
            try {
                await archiveStudent(item.student_number)
                this.showDialog('Success', 'Student archived successfully')
                this.loadStudents()
            } catch (error) {
                console.error('Failed to archive student:', error)
                const message = error.response?.data?.message || error.message || 'Failed to archive student'
                this.showDialog('Archive Error', message, true)
            }
        },
        async confirmRestore(item) {
            try {
                await restoreStudent(item.student_number)
                this.showDialog('Success', 'Student restored successfully')
                this.loadStudents()
            } catch (error) {
                console.error('Failed to restore student:', error)
                const message = error.response?.data?.message || error.message || 'Failed to restore student'
                this.showDialog('Restore Error', message, true)
            }
        },
    },
}
</script>