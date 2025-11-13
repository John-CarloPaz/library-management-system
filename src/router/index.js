import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import ManageBooks from '@/views/ManageBooks.vue'
import EditBooks from '@/views/EditBooks.vue'
import Login from '@/views/Login.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/home',
      name: 'home',
      component: Dashboard,
    },
    {
      path: '/manage-books',
      name: 'manage-books',
      component: ManageBooks,
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/manage-books/create',
      name: 'create-book',
      component: () => import('@/views/CreateBooks.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin'] },
    },
    {
      path: '/manage-books/edit/:bookCode',
      name: 'edit-book',
      component: EditBooks,
      props: true,
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin'] },
    },
    {
      path: '/manage-books/view/:bookCode',
      name: 'view-book',
      component: () => import('@/views/ViewBookDetails.vue'),
      props: true,
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/',
      name: 'login',
      component: Login,
    },
    {
      path: '/branch-management',
      name: 'branch-management',
      component: () => import('@/views/BranchManagement.vue'),
      meta: { requiresAuth: true, roles: ['super_admin'] },
    },
    
    {
      path: '/student-management',
      name: 'student-management',
      component: () => import('@/views/StudentManagement.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin'] },
    },
    {
      path: '/records',
      name: 'records',
      component: () => import('@/views/Records.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/admin-management',
      name: 'admin-management',
      component: () => import('@/views/AdminManagement.vue'),
      meta: { requiresAuth: true, roles: ['super_admin'] },
    },
    {
      path: '/create-admin',
      name: 'create-admin',
      component: () => import('@/views/CreateAdmin.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/return-books',
      name: 'return-books',
      component: () => import('@/views/ReturnBooks.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/borrow-books',
      name: 'borrow-books',
      component: () => import('@/views/BorrowBooks.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
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

// Global navigation guard enforcing authentication and role-based access
router.beforeEach((to, from, next) => {
  const requiresAuth = to.meta && to.meta.requiresAuth;
  const allowedRoles = (to.meta && to.meta.roles) || null;

  // read session from localStorage (same key used by Login.vue)
  let session = null;
  try {
    const s = localStorage.getItem('app_session');
    if (s) session = JSON.parse(s);
  } catch (e) {
    session = null;
  }

  if (requiresAuth) {
    if (!session || !session.email) {
      const msg = "Access denied: you must be logged in to view";
      try { window.alert(msg); } catch(e) { console.warn(msg); }
      return next({ name: 'login' });
    }

    // If roles are defined, check authorization. Super Admin bypasses checks.
    if (allowedRoles && Array.isArray(allowedRoles)) {
      // Normalize role strings so meta entries like "Super Admin" match stored
      // roles such as "super_admin". We lowercase and convert spaces to
      // underscores for a consistent comparison.
      const role = (session.role || '').toString();
      const normalize = (s) => s.toString().toLowerCase().replace(/\s+/g, '_');
      const normalizedRole = normalize(role);
      const allowedNormalized = allowedRoles.map(normalize);

      // Super admin bypass or membership in allowed set (normalized).
      if (normalizedRole === 'super_admin' || allowedNormalized.includes(normalizedRole)) {
        return next();
      }
      // not authorized -> show dialog and redirect to login (or a 403 page)
      const msg = `Access denied: your role ('${role}') is not allowed to visit '${to.name || to.path}'.`;
      try { window.alert(msg); } catch(e) { console.warn(msg); }
      return next({ name: 'login' });
    }

    return next();
  }

  // No auth required
  return next();
});
