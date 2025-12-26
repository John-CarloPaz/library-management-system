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
                    <template #button-actions>
                        <v-btn prepend-icon="fa-plus" variant="tonal" @click="createNew">Create Student</v-btn>
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

                <Table
                    :headers="headers"
                    :items="filteredStudents"
                    :items-length="totalStudents"
                    :loading="loading"
                    v-model:items-per-page="itemsPerPage"
                    item-key="id"
                    @update:options="loadItems"
                >
                    <template #actions="{ item }">
                        <v-btn icon="fa-eye" size="x-small" variant="plain" @click.stop="viewStudent(item)"></v-btn>
                        <v-btn icon="fa-pencil" size="x-small" variant="plain" @click.stop="editStudent(item)"></v-btn>
                        <!-- Print Student ID card (always visible; handler will warn if QR is missing) -->
                        <v-btn
                            icon="fa-id-card"
                            size="x-small"
                            variant="plain"
                            @click.stop="printStudentId(item)"
                        ></v-btn>
                        <!-- Print raw QR code (same implementation style as Catalogue / ManageBooks) -->
                        <v-btn
                            icon="fa-qrcode"
                            size="x-small"
                            variant="plain"
                            @click.stop="printQr(item)"
                        ></v-btn>
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

        <ErrorDialog
            :visible.sync="dialog.visible"
            :title="dialog.title"
            :message="dialog.message"
            :isError="dialog.isError"
            @update:visible="dialog.visible = $event"
        />
    </v-container>
</template>

<script>
import AppBar from '@/components/AppBar.vue'
import Table from '@/components/Table.vue'
import FilterDrawer from '@/components/FilterDrawer.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import ScopeTab from '@/components/ScopeTab.vue'
import { printQrCodes, printStudentIdCards } from '@/services/qrPrint'
import {
    fetchStudentsPage,
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
            loading: false,
            scope: 'active',
            students: [],
            filteredStudents: [],
            totalStudents: 0,
            itemsPerPage: 10,
            tableOptions: {
                page: 1,
                itemsPerPage: 10,
                sortBy: [],
            },
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
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'archived', label: 'Archived' },
            ],
            headers: [
                { text: 'ID', value: 'id' },
                { text: 'Name', value: 'name' },
                { text: 'Email', value: 'email' },
                { text: 'Student ID', value: 'student_id' },
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
        }
    },
    mounted() {
        this.loadItems({
            page: 1,
            itemsPerPage: this.itemsPerPage,
            sortBy: [],
        })
    },
    watch: {
        scope() {
            // Reload from backend when scope changes, reset to first page
            this.loadItems({
                page: 1,
                itemsPerPage: this.itemsPerPage,
                sortBy: this.tableOptions.sortBy || [],
            })
        },
    },
    methods: {
        async loadItems({ page, itemsPerPage, sortBy }) {
            this.loading = true
            this.tableOptions = {
                page: page || 1,
                itemsPerPage: itemsPerPage || this.itemsPerPage,
                sortBy: sortBy || [],
            }

            try {
                const scopeFilters = this.getScopeFilters()
                const { items, total } = await fetchStudentsPage({
                    ...scopeFilters,
                    page: this.tableOptions.page,
                    itemsPerPage: this.tableOptions.itemsPerPage,
                })

                const normalize = (s) => ({
                    ...s,
                    // Ensure we keep both primary key and student number, falling back as needed
                    student_id: s.student_id ?? s.id ?? s.student_number,
                    student_number: s.student_number ?? s.student_id ?? s.id,
                    name: [s.first_name, s.middle_name, s.last_name, s.suffix].filter(Boolean).join(' '),
                })

                this.students = Array.isArray(items) ? items.map(s => normalize(s)) : []
                this.totalStudents = typeof total === 'number' ? total : this.students.length

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
            if (this.scope === 'archived') {
                return { archived: 'true' }
            }
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
                    (s.student_id && String(s.student_id).includes(q))
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
        createNew() {
            this.$router.push({ name: 'create-student' })
        },
        viewStudent(item) {
            // Backend student routes expect the public student_number identifier
            this.$router.push({ name: 'view-student', params: { studentNumber: item.student_number } })
        },
        editStudent(item) {
            this.$router.push({ name: 'edit-student', params: { studentNumber: item.student_number } })
        },
        async confirmArchive(item) {
            try {
                // Archive uses student number in the URL path
                await archiveStudent(item.student_number)
                this.showDialog('Success', 'Student archived successfully')
                this.loadItems(this.tableOptions)
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
                this.loadItems(this.tableOptions)
            } catch (error) {
                console.error('Failed to restore student:', error)
                const message = error.response?.data?.message || error.message || 'Failed to restore student'
                this.showDialog('Restore Error', message, true)
            }
        },
        printStudentId(item) {
            try {
                if (!item || !item.qr_code) {
                    console.warn('printStudentId called without qr_code')
                    return
                }

                // Use the same pattern as other modules: pass the raw
                // student object to the print service and let it format
                // the layout and QR URL.
                printStudentIdCards([item])
            } catch (e) {
                console.error('Failed to print student ID card:', e)
                this.showDialog('Print Error', 'Failed to print student ID card.', true)
            }
        },
        printQr(item) {
            try {
                if (!item || !item.qr_code) {
                    console.warn('printQr called without qr_code')
                    return
                }

                const qrItem = {
                    title: [item.first_name, item.middle_name, item.last_name, item.suffix].filter(Boolean).join(' ') || `Student ${item.student_id}`,
                    qr_code: item.qr_code,
                }
                printQrCodes([qrItem], qrItem.title)
            } catch (e) {
                console.error('Failed to print student QR:', e)
                this.showDialog('Print Error', 'Failed to print QR code.', true)
            }
        },
    },
}
</script>
