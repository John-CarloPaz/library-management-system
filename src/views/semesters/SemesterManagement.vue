<template>
  <v-container>
    <v-row>
      <v-col class="mt-8">
        <AppBar title="Semester Management">
          <template #button-actions>
            <v-btn prepend-icon="fa-plus" variant="tonal" @click="goToCreate">Create Semester</v-btn>
          </template>
        </AppBar>

        <ScopeTab
          v-model="scope"
          :scopes="semesterScopes"
          class="mt-4 mb-2"
        />

        <Table
          :headers="headers"
          :items="semesters"
          :items-length="totalSemesters"
          :loading="loading"
          v-model:items-per-page="itemsPerPage"
          item-key="id"
          @update:options="loadItems"
        >
          <template #cell-start_date="{ item }">
            {{ formatDate(item.start_date) }}
          </template>
          <template #cell-end_date="{ item }">
            {{ formatDate(item.end_date) }}
          </template>
          <template #actions="{ item }">
            <v-btn
              icon="fa-eye"
              size="x-small"
              variant="plain"
              @click.stop="goToView(item)"
            ></v-btn>
            <v-btn
              icon="fa-pencil"
              size="x-small"
              variant="plain"
              @click.stop="goToEdit(item)"
            ></v-btn>
            <v-btn
              v-if="scope === 'active'"
              icon="fa-box-archive"
              size="x-small"
              variant="plain"
              @click.stop="confirmArchive(item)"
            ></v-btn>
            <v-btn
              v-if="scope === 'archived'"
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
      :visible.sync="errorDialog.visible"
      :title="errorDialog.title"
      :message="errorDialog.message"
      :isError="true"
      @update:visible="errorDialog.visible = $event"
    />
  </v-container>
</template>

<script>
import AppBar from '@/components/AppBar.vue'
import Table from '@/components/Table.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import ScopeTab from '@/components/ScopeTab.vue'
import { fetchSemestersPage, deleteSemester, restoreSemester } from '@/services/semester'

export default {
  name: 'semester-management',
  components: { AppBar, Table, ErrorDialog, ScopeTab },
  data() {
    return {
      loading: false,
      scope: 'active',
      semesters: [],
      totalSemesters: 0,
      itemsPerPage: 10,
      tableOptions: {
        page: 1,
        itemsPerPage: 10,
        sortBy: [],
      },
      headers: [
        { text: 'ID', value: 'id' },
        { text: 'Name', value: 'name' },
        { text: 'Start Date', value: 'start_date' },
        { text: 'End Date', value: 'end_date' },
        { text: 'Actions', value: 'actions', sortable: false },
      ],
      semesterScopes: [
        { value: 'active', label: 'Active' },
        { value: 'archived', label: 'Archived' },
      ],
      errorDialog: {
        visible: false,
        title: '',
        message: '',
      },
    }
  },
  mounted() {
    // Initial load is triggered by Table via update:options, but we ensure defaults are set
    this.loadItems({ page: 1, itemsPerPage: this.itemsPerPage, sortBy: [] })
  },
  watch: {
    scope() {
      // Reload when scope changes, resetting to first page
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
        const { items, total } = await fetchSemestersPage({
          scope: this.scope,
          page: this.tableOptions.page,
          itemsPerPage: this.tableOptions.itemsPerPage,
        })

        this.semesters = Array.isArray(items) ? items : []
        this.totalSemesters = typeof total === 'number' ? total : this.semesters.length
      } catch (error) {
        this.showError('Load Failed', error.response?.data?.message || error.message || 'Failed to load semesters')
      } finally {
        this.loading = false
      }
    },
    goToCreate() {
      this.$router.push({ name: 'create-semester' })
    },
    goToView(semester) {
      this.$router.push({ name: 'view-semester', params: { id: semester.id } })
    },
    goToEdit(semester) {
      this.$router.push({ name: 'edit-semester', params: { id: semester.id } })
    },
    async confirmArchive(semester) {
      if (!window.confirm('Are you sure you want to archive this semester?')) return
      try {
        await deleteSemester(semester.id)
        await this.loadItems(this.tableOptions)
      } catch (error) {
        this.showError('Archive Failed', error.response?.data?.message || error.message || 'Failed to archive semester')
      }
    },
    async confirmRestore(semester) {
      if (!window.confirm('Are you sure you want to restore this semester?')) return
      try {
        await restoreSemester(semester.id)
        await this.loadItems(this.tableOptions)
      } catch (error) {
        this.showError('Restore Failed', error.response?.data?.message || error.message || 'Failed to restore semester')
      }
    },
    formatDate(value) {
      if (!value) return ''
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return value
      return d.toLocaleDateString()
    },
    showError(title, message) {
      this.errorDialog = { visible: true, title, message }
    },
  },
}
</script>
