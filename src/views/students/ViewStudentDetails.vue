<template>
    <AppBar title="Member Details">
        <template #title-actions>
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

    <StatusBanner
        v-if="bannerMessage"
        :type="bannerType"
        :message="bannerMessage"
        :duration="5000"
        class="mt-4"
    />

    <v-container class="mt-4">
        <v-row>
            <v-col cols="12">
                <v-card elevation="0" class="py-3" v-if="!isLoading && student">
                    <v-card-text>
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

                        <v-row class="mt-4" justify="end">
                            <v-btn
                                variant="outlined"
                                class="mr-2 bg-white text-primary"
                                @click="goBack"
                            >
                                Back
                            </v-btn>
                            <v-btn
                                color="primary"
                                @click="editStudent"
                            >
                                Edit
                            </v-btn>
                        </v-row>
                    </v-card-text>
                </v-card>

                <v-card elevation="1" v-if="isLoading" class="py-3">
                    <v-card-text>
                        <v-progress-linear indeterminate></v-progress-linear>
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
import InfoTable from '@/components/InfoTable.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import StatusBanner from '@/components/StatusBanner.vue'
import { getStudentByNumber } from '@/services/student'
import { printQrCodes, getQrCodeUrl } from '@/services/qrPrint'

export default {
    name: 'view-student',
    components: { AppBar, InfoTable, ErrorDialog, StatusBanner },
    props: {
        studentNumber: {
            type: [String, Number],
            required: true,
        },
    },
    data() {
        return {
            student: null,
            isLoading: false,
            bannerMessage: '',
            bannerType: 'success',
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
            return getQrCodeUrl(this.student.qr_code)
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
                { label: 'Semester End Date', value: this.student.semester && this.student.semester.end_date ? this.student.semester.end_date : null },
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
        if (this.$route.query.success === 'true' || this.$route.query.success === true) {
            this.bannerMessage = 'Student updated successfully!'
            this.bannerType = 'success'
        }
        this.loadStudent()
    },
    methods: {
        async loadStudent() {
            this.isLoading = true
            try {
                this.student = await getStudentByNumber(this.studentNumber)
            } catch (error) {
                const message = error.response?.data?.message || error.message || 'Failed to load student'
                this.showDialog('Load Failed', message, true)
                this.$router.push({ name: 'member-management' })
            } finally {
                this.isLoading = false
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
            if (!this.student || !this.student.qr_code) return
            const url = getQrCodeUrl(this.student.qr_code)
            if (!url) return
            window.open(url, '_blank')
        },
        printQr() {
            try {
                if (!this.student || !this.student.qr_code) return
                const qrItem = {
                    title: this.fullName || `Student ${this.student.student_id}`,
                    qr_code: this.student.qr_code,
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
