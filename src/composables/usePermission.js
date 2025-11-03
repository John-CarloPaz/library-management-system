import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getSession, can as canCheck, ACTIONS } from '@/services/permission'

export function usePermission() {
  const session = ref(getSession())

  const refresh = () => {
    session.value = getSession()
  }

  const can = (action) => {
    return canCheck(action, session.value)
  }

  onMounted(() => {
    window.addEventListener('storage', refresh)
  })
  onUnmounted(() => {
    window.removeEventListener('storage', refresh)
  })

  const role = computed(() => (session.value && session.value.role) || null)

  return { session, role, can, ACTIONS }
}

export default usePermission
