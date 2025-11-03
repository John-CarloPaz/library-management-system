import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import Information from '@/views/Information.vue'
import EnrolledSubject from '@/views/EnrolledSubject.vue'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/home',
      name: 'home',
      component: Dashboard,
    },
    {
      path: '/information',
      name: 'information',
      component: Information,
    },
    {
      path: '/subjects',
      name: 'enrolled-subjects', 
      component: EnrolledSubject
    }
    // {
    //   path: '/about',
    //   name: 'about',
    //   // route level code-splitting
    //   // this generates a separate chunk (About.[hash].js) for this route
    //   // which is lazy-loaded when the route is visited.
    //   component: () => import('../views/AboutView.vue'),
    // },
  ],
})

export default router
