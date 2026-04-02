import { getAxiosInstance, getSession } from './auth'

const api = () => getAxiosInstance()

export async function fetchNotifications({ page = 1, perPage = 20, unreadOnly = false } = {}) {
  const response = await api().get('/notifications', {
    params: {
      page,
      per_page: perPage,
      unread_only: unreadOnly ? 1 : undefined,
    },
  })
  return response.data
}

export async function fetchUnreadCount() {
  const response = await api().get('/notifications/unread-count')
  return response.data?.count || 0
}

export async function markRead(id) {
  return api().post(`/notifications/mark-read/${id}`)
}

export async function markReadBulk(ids) {
  return api().post('/notifications/mark-read', { ids })
}

export async function createAnnouncement({ title, message, scope, branch_ids }) {
  return api().post('/notifications/announcements', { title, message, scope, branch_ids })
}
