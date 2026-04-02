<template>
  <AppBar title="Edit Account">
    <template #title-actions>
      <v-btn text @click="cancel">Back</v-btn>
    </template>
  </AppBar>

  <v-container>
    <v-card elevation="0" class="py-3">
      <v-card-text>
        <v-progress-linear v-if="isLoading" indeterminate></v-progress-linear>

        <v-form ref="formRef" @submit.prevent="onSubmit" v-if="!isLoading">
          <v-row class="mb-4" dense>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.first_name" label="First Name" :error-messages="errors.first_name" required variant="solo" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.last_name" label="Last Name" :error-messages="errors.last_name" required variant="solo" />
            </v-col>
          </v-row>

          <v-row class="mb-4" dense>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.username" label="Username" :error-messages="errors.username" required variant="solo" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.email" label="Email" :error-messages="errors.email" required variant="solo" />
            </v-col>
          </v-row>

          <v-row class="mb-4" dense>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.middle_name" label="Middle Name" :error-messages="errors.middle_name" variant="solo" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.suffix" label="Suffix" :error-messages="errors.suffix" variant="solo" />
            </v-col>
          </v-row>

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-text-field v-model="form.password" label="Password" type="password" :error-messages="errors.password" variant="solo" hint="Leave blank to keep current password" persistent-hint />
            </v-col>
          </v-row>

          <v-row>
            <v-col class="d-flex justify-end">
              <v-btn text @click="cancel" class="mx-3" :disabled="isSubmitting">Cancel</v-btn>
              <v-btn color="primary" @click="onSubmit" :loading="isSubmitting" :disabled="isSubmitting">Update</v-btn>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
    </v-card>

    <ErrorDialog :visible.sync="dialog.visible" :title="dialog.title" :message="dialog.message" :isError="dialog.isError" />
  </v-container>
</template>

<script>
import AppBar from '@/components/AppBar.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { fetchLoggedInUser, editLoggedInUser } from '@/services/user'

export default {
  name: 'account-edit',
  components: { AppBar, ErrorDialog },
  data() {
    return {
      isLoading: false,
      isSubmitting: false,
      dialog: { visible: false, title: '', message: '', isError: false },
      form: {
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        middle_name: '',
        suffix: '',
      },
      errors: {},
    }
  },
  mounted() {
    this.load()
  },
  methods: {
    showDialog(title, message, isError = false) {
      this.dialog = { visible: true, title, message, isError }
    },
    async load() {
      this.isLoading = true
      try {
        const u = await fetchLoggedInUser()
        this.form = {
          username: u.username || '',
          email: u.email || '',
          password: '',
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          middle_name: u.middle_name || '',
          suffix: u.suffix || '',
        }
        this.errors = {}
      } catch (err) {
        this.showDialog('Load Failed', err?.response?.data?.message || err?.message || 'Failed to load profile', true)
      } finally {
        this.isLoading = false
      }
    },
    cancel() {
      try { this.$router.push({ name: 'account' }) } catch (e) { this.$router.back() }
    },
    async onSubmit() {
      this.isSubmitting = true
      try {
        const payload = { ...this.form }
        if (!payload.password) delete payload.password
        const res = await editLoggedInUser(payload)
        this.showDialog('Saved', res?.message || 'Profile updated')
        setTimeout(() => { this.$router.push({ name: 'account' }) }, 600)
      } catch (err) {
        this.showDialog('Save Error', err?.response?.data?.message || err?.message || 'Failed to save profile', true)
      } finally {
        this.isSubmitting = false
      }
    }
  }
}
</script>

<style scoped>
.v-card-title { font-weight: 600 }
</style>
