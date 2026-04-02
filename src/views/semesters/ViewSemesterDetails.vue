<template>
  <AppBar title="Semester Details" />
  <v-container class="mt-4">
    <v-row>
      <v-col cols="12">
        <v-card elevation="0" class="py-3" v-if="!isLoading && semester">
          <v-card-text>
            <InfoTable
              title="Semester Information"
              :fields="semesterFields"
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
                @click="editSemester"
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
import InfoTable from '@/components/InfoTable.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { getSemester } from '@/services/semester'

export default {
  name: 'view-semester-details',
  components: { AppBar, InfoTable, ErrorDialog },
  props: {
    id: {
      type: [String, Number],
      required: true,
    },
  },
  data() {
    return {
      semester: null,
      isLoading: false,
      dialog: {
        visible: false,
        title: '',
        message: '',
        isError: false,
      },
    }
  },
  computed: {
    semesterFields() {
      if (!this.semester) return []
      return [
        { label: 'ID', value: this.semester.id },
        { label: 'Name', value: this.semester.name },
        { label: 'Start Date', value: this.semester.start_date },
        { label: 'End Date', value: this.semester.end_date },
        { label: 'Archived', value: !!this.semester.is_archived },
      ]
    },
  },
  created() {
    this.loadSemester()
  },
  methods: {
    async loadSemester() {
      this.isLoading = true
      try {
        this.semester = await getSemester(this.id)
      } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to load semester'
        this.dialog = { visible: true, title: 'Load Failed', message, isError: true }
        this.$router.push({ name: 'semester-management' })
      } finally {
        this.isLoading = false
      }
    },
    editSemester() {
      this.$router.push({ name: 'edit-semester', params: { id: this.id } })
    },
    goBack() {
      this.$router.back()
    },
  },
}
</script>
