<template>
    <AppBar title="Student Details">
        <template #title-actions>
            <v-btn text @click="goBack">Back</v-btn>
            <v-btn color="primary" v-if="student" @click="editStudent">Edit</v-btn>
            <v-btn
                v-if="student && student.qr_code"
                color="primary"
                prepend-icon="fa-qrcode"
                @click="printQr"
            >
                Print QR Code
            </v-btn>
        </template>
    </AppBar>

    <v-container class="mt-4">
        <v-row>
            <v-col cols="12" md="8" v-if="student">
                <InfoTable
                    title="Student Information"
                    :fields="studentFieldsData"
                />

                <InfoTable
                    title="Status"
                    :fields="statusFieldsData"
                />

                <InfoTable
                    v-if="student.qr_code"
                    title="QR Code"
                    :fields="qrFieldsData"
                />
            </v-col>
            <v-col cols="12" v-else>
                <v-card>
                    <v-card-text>Loading...</v-card-text>
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
import InfoTable from '@/components/InfoTable.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { getStudentByNumber } from '@/services/student'
import { printQrCodes } from '@/services/qrPrint'

export default {
    name: 'view-student',
    components: { AppBar, InfoTable, ErrorDialog },
    props: {
        studentNumber: {
            type: [String, Number],
            required: true,
        },
    },
    data() {
        return {
            student: null,
            dialog: {
                visible: false,
                title: '',
                message: '',
                isError: false,
            },
        }
    },
    computed: {
        fullName() {
            if (!this.student) return ''
            const { first_name, middle_name, last_name, suffix } = this.student
            return [first_name, middle_name, last_name, suffix].filter(Boolean).join(' ')
        },
        qrUrl() {
            if (!this.student || !this.student.qr_code) return ''
            const base = import.meta.env.VITE_STORAGE_URL || `${import.meta.env.VITE_API_URL || ''}/storage`
            return `${base}/${this.student.qr_code}`
        },
        studentFieldsData() {
            if (!this.student) return []
            const studentNumber = this.student.student_id
            return [
                { label: 'ID', value: this.student.id },
                { label: 'Name', value: this.fullName },
                { label: 'Email', value: this.student.email },
                { label: 'Student Number', value: studentNumber },
                { label: 'Program', value: this.student.program },
                { label: 'Year Level', value: this.student.year_level },
            ]
        },
        statusFieldsData() {
            if (!this.student) return []
            return [
                { label: 'Status', value: this.student.status },
                { label: 'Archived', value: !!this.student.is_archived },
            ]
        },
        qrFieldsData() {
            if (!this.student || !this.student.qr_code) return []
            return [
                {
                    label: 'QR Code',
                    value: this.qrUrl,
                    isLink: true,
                    onClick: this.openQrInNewTab,
                },
            ]
        },
    },
    created() {
        this.loadStudent()
    },
    methods: {
        async loadStudent() {
            try {
                this.student = await getStudentByNumber(this.studentNumber)
            } catch (error) {
                const message = error.response?.data?.message || error.message || 'Failed to load student'
                this.showDialog('Load Failed', message, true)
                this.$router.push({ name: 'student-management' })
            }
        },
        editStudent() {
            if (!this.student) return
            this.$router.push({ name: 'edit-student', params: { studentNumber: this.student.student_id } })
        },
        goBack() {
            this.$router.back()
        },
        showDialog(title, message, isError) {
            this.dialog = { visible: true, title, message, isError }
        },
        openQrInNewTab() {
            if (!this.qrUrl) return
            window.open(this.qrUrl, '_blank')
        },
        printQr() {
            try {
                if (!this.student || !this.student.qr_code) return
                const qrItem = {
                    title: this.fullName || `Student ${this.student.student_id}`,
                    qr_code: this.qrUrl,
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
