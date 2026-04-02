<template>
  <AppBar title="Account" />

  <v-container class="pa-6" fluid>
    <v-row>
      <v-col class="mt-8">
        <v-progress-linear v-if="!loaded" indeterminate></v-progress-linear>

        <v-card class="mt-4" elevation="0" v-if="loaded">
          <v-card-text>
            <InfoTable :title="'Account Details'" :fields="fields" />
          </v-card-text>

          <v-row class="mt-4">
            <v-col class="d-flex justify-end">
              <v-btn color="primary" :disabled="!loaded" @click="goEdit">Edit</v-btn>
            </v-col>
          </v-row>
        </v-card>

        <ErrorDialog :visible.sync="dialog.visible" :title="dialog.title" :message="dialog.message" :isError="dialog.isError" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import AppBar from '@/components/AppBar.vue'
import InfoTable from '@/components/InfoTable.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { fetchLoggedInUser } from '@/services/user'
import { getSession } from '@/services/auth'
import { useRouter } from 'vue-router'

const router = useRouter()
const session = getSession() || {}

const user = ref(null)
const loadingUser = ref(false)
const dialog = ref({ visible: false, title: '', message: '', isError: false })

const loaded = computed(() => !loadingUser.value && !!user.value)

function showDialog(title, message, isError = false) {
  dialog.value = { visible: true, title, message, isError }
}

async function load() {
  loadingUser.value = true
  try {
    const data = await fetchLoggedInUser()
    user.value = data
  } catch (err) {
    showDialog('Load Error', err?.response?.data?.message || err?.message || 'Failed to load user', true)
  } finally {
    loadingUser.value = false
  }
}

onMounted(() => { load() })

const fields = computed(() => {
  const u = user.value || {}
  return [
    { label: 'Username', value: u.username },
    { label: 'Email', value: u.email },
    { label: 'First Name', value: u.first_name },
    { label: 'Last Name', value: u.last_name },
    { label: 'Middle Name', value: u.middle_name },
    { label: 'Suffix', value: u.suffix },
  ]
})

function goEdit() {
  router.push({ name: 'account-edit' })
}
</script>

<style scoped>
.v-card { border-radius: 8px }
h3 { margin-bottom: 8px }
</style>
