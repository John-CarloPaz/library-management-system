<template>
    <v-container fluid>
        <v-row>
            <v-col cols="12" class="mt-8">
                <AppBar title="Emailed Reminders">
                    <template #search-actions>
                        <div class="d-flex align-center" style="max-width: 360px;">
                            <v-text-field
                                v-model="dueDate"
                                type="date"
                                density="compact"
                                label="Due Date"
                                variant="solo-filled"
                                hide-details="auto"
                                append-inner-icon="fa-calendar"
                                @update:modelValue="onDueDateChange"
                            />
                        </div>
                    </template>
                </AppBar>

                <Table
                    class="mt-4"
                    :headers="headers"
                    :items="rows"
                    :items-length="total"
                    :loading="loading"
                    v-model:items-per-page="itemsPerPage"
                    item-key="student_id"
                    @update:options="onUpdateOptions"
                >
                    <template #cell-last_sent_at="{ item }">
                        {{ formatDateTime(item.last_sent_at) }}
                    </template>
                </Table>
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
import Table from '@/components/Table.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { fetchEmailedBorrowReminders } from '@/services/borrow'

export default {
    name: 'EmailedReminders',
    components: { AppBar, Table, ErrorDialog },
    data() {
        return {
            dueDate: '',
            meta: {
                due_date: null,
                type: null,
                channel: null,
            },
            allRows: [],
            rows: [],
            total: 0,
            loading: false,
            itemsPerPage: 10,
            tableOptions: {
                page: 1,
                itemsPerPage: 10,
                sortBy: [],
            },
            dialog: {
                visible: false,
                title: 'Error',
                message: '',
                isError: true,
            },
        }
    },
    computed: {
        headers() {
            return [
                { title: 'Due Date', value: 'due_date' },
                { title: 'Type', value: 'type' },
                { title: 'Channel', value: 'channel' },
                { title: 'Student ID', value: 'student_id' },
                { title: 'Name', value: 'name' },
                { title: 'Email', value: 'email' },
                { title: 'Borrow Count', value: 'borrow_count' },
                { title: 'Last Sent At', value: 'last_sent_at' },
            ]
        },
    },
    created() {
        this.dueDate = this.getTomorrowDate()
    },
    mounted() {
        this.load()
    },
    methods: {
        getTomorrowDate() {
            const d = new Date()
            d.setDate(d.getDate() + 1)
            return d.toISOString().split('T')[0]
        },
        onUpdateOptions(options) {
            this.tableOptions = options
            this.applyPagination()
        },
        onDueDateChange() {
            // Reload on due-date change (and reset pagination to page 1)
            if (!this.dueDate) {
                this.dueDate = this.getTomorrowDate()
            }
            this.tableOptions = {
                ...(this.tableOptions || {}),
                page: 1,
            }
            this.load()
        },
        formatDateTime(val) {
            if (!val) return '-'
            try {
                return new Date(val).toLocaleString()
            } catch (e) {
                return String(val)
            }
        },
        getEffectiveMeta() {
            return {
                due_date: this.meta?.due_date || this.dueDate || null,
                type: this.meta?.type || 'due_soon',
                channel: this.meta?.channel || 'email',
            }
        },
        getRowsWithMeta(rows) {
            const meta = this.getEffectiveMeta()
            const arr = Array.isArray(rows) ? rows : []
            return arr.map(r => ({
                ...r,
                due_date: r?.due_date || meta.due_date,
                type: r?.type || meta.type,
                channel: r?.channel || meta.channel,
            }))
        },
        sortLatestFirst(rows) {
            const arr = Array.isArray(rows) ? [...rows] : []
            // Latest first = descending by last_sent_at; fallback to stable-ish ordering
            arr.sort((a, b) => {
                const ta = a?.last_sent_at ? new Date(a.last_sent_at).getTime() : 0
                const tb = b?.last_sent_at ? new Date(b.last_sent_at).getTime() : 0
                if (tb !== ta) return tb - ta

                // secondary: numeric student_id (if possible)
                const sa = Number(a?.student_id)
                const sb = Number(b?.student_id)
                if (!Number.isNaN(sb) && !Number.isNaN(sa) && sb !== sa) return sb - sa
                return String(b?.student_id || '').localeCompare(String(a?.student_id || ''))
            })
            return arr
        },
        applyPagination() {
            const page = Number(this.tableOptions?.page || 1)
            const perPage = Number(this.tableOptions?.itemsPerPage || this.itemsPerPage || 10)
            const start = Math.max(0, (page - 1) * perPage)
            const end = start + perPage
            const src = this.sortLatestFirst(this.getRowsWithMeta(this.allRows))
            this.rows = src.slice(start, end)
            this.total = src.length
        },
        async load() {
            this.loading = true
            try {
                const res = await fetchEmailedBorrowReminders({ due_date: this.dueDate })
                this.meta = {
                    due_date: res.due_date || this.dueDate,
                    type: res.type || 'due_soon',
                    channel: res.channel || 'email',
                }
                this.allRows = Array.isArray(res.data) ? res.data : []
                this.applyPagination()
            } catch (e) {
                const message =
                    e?.response?.data?.message ||
                    e?.response?.data?.error ||
                    e?.message ||
                    'Unable to load emailed reminders.'

                this.allRows = []
                this.rows = []
                this.total = 0
                this.dialog = {
                    visible: true,
                    title: 'Failed to Load',
                    message,
                    isError: true,
                }
            } finally {
                this.loading = false
            }
        },
    },
}
</script>
