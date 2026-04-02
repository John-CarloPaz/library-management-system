<template>
  <v-dialog v-model="modelValue" max-width="560">
    <v-card>
      <v-card-title>Create Announcement</v-card-title>
      <v-card-text>
        <v-form ref="form" @submit.prevent="submit">
          <v-text-field v-model="announcement.title" label="Title" required />
          <v-textarea v-model="announcement.message" label="Message" required />
          <v-select v-model="announcement.scope" :items="scopeOptions" label="Scope" required />
          <v-select
            v-if="announcement.scope === 'branches'"
            v-model="announcement.branch_ids"
            :items="branchOptions"
            item-title="title"
            item-value="value"
            label="Branches"
            multiple
            chips
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="close">Cancel</v-btn>
        <v-btn color="primary" @click="submit">Send</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { createAnnouncement } from '@/services/notification'
import { listActiveBranches } from '@/services/branch'
import eventBus from '@/utils/eventBus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits(['update:modelValue', 'created'])

const modelValue = ref(props.modelValue)
watch(() => props.modelValue, v => modelValue.value = v)
watch(modelValue, v => emit('update:modelValue', v))

const announcement = ref({ title: '', message: '', scope: 'all', branch_ids: [] })
const scopeOptions = [
  { value: 'all', title: 'All Users' },
  { value: 'branches', title: 'Selected Branches' },
]
const branchOptions = ref([])

const loadBranches = async () => {
  try {
    const branches = await listActiveBranches()
    branchOptions.value = branches.map(b => ({ value: b.id, title: b.name }))
  } catch (e) {
    branchOptions.value = []
  }
}

onMounted(() => {
  loadBranches()
})

const form = ref(null)

const close = () => {
  modelValue.value = false
}

const submit = async () => {
  if (!announcement.value.title || !announcement.value.message || !announcement.value.scope) return
  try {
    await createAnnouncement(announcement.value)
    eventBus.emit('announcement-created')
    emit('created')
    // reset
    announcement.value = { title: '', message: '', scope: 'all', branch_ids: [] }
    modelValue.value = false
  } catch (e) {
    // swallow or show error
  }
}
</script>
