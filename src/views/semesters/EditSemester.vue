<template>
  <v-container>
    <v-row>
      <v-col class="mt-8">
        <AppBar title="Edit Semester"/>
        <v-progress-linear v-if="!loaded" indeterminate></v-progress-linear>

        <v-card class="mt-4" v-if="loaded">
          <v-card-title>Edit Semester</v-card-title>
          <v-card-text>
            <v-form ref="form" @submit.prevent="submit">
              <v-text-field
                v-model="form.name"
                label="Name"
                variant="outlined"
                density="compact"
                class="mb-4"
                :rules="[v => !!v || 'Name is required']"
              />
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.start_date"
                    label="Start Date"
                    type="date"
                    variant="outlined"
                    density="compact"
                    class="mb-4"
                    :rules="[v => !!v || 'Start date is required']"
                    append-inner-icon="fa-calendar"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.end_date"
                    label="End Date"
                    type="date"
                    variant="outlined"
                    density="compact"
                    class="mb-2"
                    :rules="[v => !!v || 'End date is required']"
                    append-inner-icon="fa-calendar"
                  />
                </v-col>
              </v-row>
              </v-form>
            </v-card-text>
          </v-card>

          <v-row class="mt-4" v-if="loaded">
            <v-col class="d-flex justify-end">
              <v-btn text @click="goBack" class="mr-3">Cancel</v-btn>
              <v-btn color="primary" :loading="submitting" @click="submit">Update</v-btn>
            </v-col>
          </v-row>

 
        <ErrorDialog
          :visible.sync="errorDialog.visible"
          :title="errorDialog.title"
          :message="errorDialog.message"
          :isError="true"
          @update:visible="errorDialog.visible = $event"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import AppBar from '@/components/AppBar.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { getSemester, updateSemester } from '@/services/semester'

export default {
  name: 'edit-semester',
  components: { AppBar, ErrorDialog },
  props: {
    id: {
      type: [String, Number],
      required: true,
    },
  },
  data() {
    return {
      loaded: false,
      submitting: false,
      form: {
        name: '',
        start_date: '',
        end_date: '',
      },
      errorDialog: {
        visible: false,
        title: '',
        message: '',
      },
    }
  },
  created() {
    this.loadSemester()
  },
  methods: {
    async loadSemester() {
      try {
        const semester = await getSemester(this.id)
        this.form = {
          name: semester.name,
          start_date: semester.start_date,
          end_date: semester.end_date,
        }
        this.loaded = true
      } catch (error) {
        this.errorDialog = {
          visible: true,
          title: 'Load Failed',
          message: error.response?.data?.message || error.message || 'Failed to load semester',
        }
      }
    },
    async submit() {
      if (!this.$refs.form || !this.$refs.form.validate()) return
      this.submitting = true
      try {
        await updateSemester(this.id, this.form)
        this.$router.push({ name: 'semester-management' })
      } catch (error) {
        this.errorDialog = {
          visible: true,
          title: 'Save Failed',
          message: error.response?.data?.message || error.message || 'Failed to update semester',
        }
      } finally {
        this.submitting = false
      }
    },
    goBack() {
      this.$router.back()
    },
  },
}
</script>
