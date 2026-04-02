import { getAxiosInstance } from './auth'

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const API_BASE_URL = `${API_ORIGIN}/api`

export async function fetchLoggedInUser() {
  try {
    const response = await getAxiosInstance().get(`${API_BASE_URL}/users/me`)
    let data = response.data || {}
    if (data.user && typeof data.user === 'object') data = data.user
    else if (data.data && typeof data.data === 'object') data = data.data
    return data
  } catch (err) {
    console.error('fetchLoggedInUser failed:', err)
    throw err
  }
}

export async function editLoggedInUser(payload) {
  try {
    const response = await getAxiosInstance().post(`${API_BASE_URL}/users/edit-me`, payload)
    return response.data
  } catch (err) {
    console.error('editLoggedInUser failed:', err)
    throw err
  }
}

export default { fetchLoggedInUser, editLoggedInUser }
