<template>
  <v-container>
    <v-row>
      <v-col class="mt-8">
        <AppBar title="Extensions">
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

        <Table
          :headers="headers"
          :items="filteredRecords"
          :loading="loading"
          item-key="id"
        >
          <template #actions="{ item }">
            <v-btn
              icon="fa-clock-rotate-left"
              size="x-small"
              variant="plain"
              @click.stop="openExtendDialog(item)"
            />
          </template>

          <template #cell-status="{ item }">
            <v-chip
              variant="elevated"
              color="warning"
              size="small"
              v-if="item.status === 'borrowed'"
            >
              <p class="text-capitalize">{{ item.status }}</p>
            </v-chip>
            <v-chip
              variant="elevated"
              color="success"
              size="small"
              v-else-if="item.status === 'returned'"
            >
              <p class="text-capitalize">{{ item.status }}</p>
            </v-chip>
            <v-chip variant="elevated" color="error" size="small" v-else>
              <p class="text-capitalize">{{ item.status }}</p>
            </v-chip>
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

    <!-- Extend Borrow Dialog -->
    <v-dialog v-model="extendDialogVisible" max-width="500px">
      <v-card>
        <v-card-title class="text-h6">Extend Borrowing</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-text-field
                label="Borrowed Book"
                :model-value="selectedRecord?.borrowedBook || ''"
                readonly
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                label="Borrower Name"
                :model-value="selectedRecord?.borrowerName || ''"
                readonly
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                label="Current Due Date"
                :model-value="selectedRecord?.dueDate || ''"
                readonly
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="extensionDays"
                :items="extensionOptions"
                label="Extension Days"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeExtendDialog" :disabled="extendLoading">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            @click="confirmExtend"
            :loading="extendLoading"
          >
            Extend
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import AppBar from '@/components/AppBar.vue'
import Table from '@/components/Table.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { getBorrowRecords, extendBorrowing } from '@/services/borrow'

export default {
  name: 'BorrowExtensions',
  components: { AppBar, Table, ErrorDialog },
  data() {
    return {
      loading: false,
      records: [],
      filteredRecords: [],
      filters: {
        search: ''
      },
      dialog: {
        visible: false,
        title: '',
        message: '',
        isError: false
      },
      headers: [
        { text: 'ID', value: 'id' },
        { text: 'Borrowed Book', value: 'borrowedBook' },
        { text: 'Borrower Name', value: 'borrowerName' },
        { text: 'Due Date', value: 'dueDate' },
        { text: 'Status', value: 'status' },
        { text: 'Extended?', value: 'isExtendedLabel' },
        { text: 'Extension Days', value: 'extension_days' }
      ],
      extendDialogVisible: false,
      extendLoading: false,
      selectedRecord: null,
      extensionDays: null,
      extensionOptions: [3, 7, 14, 30]
    }
  },
  mounted() {
    this.loadRecords()
  },
  methods: {
    async loadRecords() {
      this.loading = true
      try {
        const data = await getBorrowRecords()
        const raw = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])

        this.records = raw
          .filter(r => (r.status || 'borrowed') === 'borrowed')
          .map(record => ({
            id: record.id,
            borrowedBook: record.book?.title || record.book_title || '',
            borrowerName: record.student?.name || record.student_name || '',
            dueDate: record.due_date ? new Date(record.due_date).toLocaleDateString() : '',
            status: record.status || 'borrowed',
            is_extended: !!record.is_extended,
            isExtendedLabel: record.is_extended ? 'Yes' : 'No',
            extension_days: record.extension_days || 0
          }))

        this.applyFilters()
      } catch (error) {
        console.error('Failed to load borrow records for extension:', error)
        const message = error.response?.data?.message || error.message || 'Failed to load borrow records.'
        this.showDialog('Load Error', message, true)
      } finally {
        this.loading = false
      }
    },
    applyFilters() {
      let items = this.records.slice()

      if (this.filters.search) {
        const q = this.filters.search.toLowerCase()
        items = items.filter(r =>
          (r.borrowedBook && r.borrowedBook.toLowerCase().includes(q)) ||
          (r.borrowerName && r.borrowerName.toLowerCase().includes(q))
        )
      }

      this.filteredRecords = items
    },
    showDialog(title, message, isError = false) {
      this.dialog = {
        visible: true,
        title,
        message,
        isError
      }
    },
    openExtendDialog(item) {
      this.selectedRecord = item
      this.extensionDays = item.extension_days || null
      this.extendDialogVisible = true
    },
    closeExtendDialog() {
      this.extendDialogVisible = false
      this.selectedRecord = null
      this.extensionDays = null
    },
    async confirmExtend() {
      if (!this.selectedRecord || !this.extensionDays) return

      this.extendLoading = true
      try {
        await extendBorrowing(this.selectedRecord.id, {
          extension_days: this.extensionDays
        })
        this.showDialog('Success', 'Borrowing extended successfully.')
        this.closeExtendDialog()
        this.loadRecords()
      } catch (error) {
        console.error('Failed to extend borrowing:', error)
        const message = error.response?.data?.message || error.message || 'Failed to extend borrowing.'
        this.showDialog('Extension Error', message, true)
      } finally {
        this.extendLoading = false
      }
    }
  }
}
</script>
