import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import ManageBooks from '@/views/ManageBooks.vue'
import EditBooks from '@/views/EditBooks.vue'
import Login from '@/views/Login.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('@/views/notifications/NotificationList.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/home',
      name: 'home',
      component: Dashboard,
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/account',
      name: 'account',
      component: () => import('@/views/AccountView.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/account/edit',
      name: 'account-edit',
      component: () => import('@/views/AccountEdit.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/manage-books',
      name: 'manage-books',
      component: ManageBooks,
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
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
      path: '/login',
      name: 'login',
      component: Login,
    },
    {
      path: '/',
      redirect: { name: 'home' },
    },
    {
      path: '/branch-management',
      name: 'branch-management',
      component: () => import('@/views/BranchManagement.vue'),
      meta: { requiresAuth: true, roles: ['super_admin'] },
    },
    
    {
      path: '/member-management',
      name: 'member-management',
      component: () => import('@/views/students/StudentManagement.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/students/create',
      name: 'create-student',
      component: () => import('@/views/students/CreateStudent.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/students/edit/:studentNumber',
      name: 'edit-student',
      component: () => import('@/views/students/EditStudent.vue'),
      props: true,
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/students/view/:studentNumber',
      name: 'view-student',
      component: () => import('@/views/students/ViewStudentDetails.vue'),
      props: true,
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
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
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin'] },
    },
    {
      path: '/create-admin',
      name: 'create-admin',
      component: () => import('@/views/CreateAdmin.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/admin-management/edit/:id',
      name: 'edit-admin',
      component: () => import('@/views/EditAdmin.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin'] },
    },
    {
      path: '/admin-management/view/:id',
      name: 'view-admin',
      component: () => import('@/views/ViewAdminDetails.vue'),
      props: true,
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin'] },
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
    },
    {
      path: '/borrow-extensions',
      name: 'borrow-extensions',
      component: () => import('@/views/BorrowExtensions.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/borrow-reminders/emailed',
      name: 'borrow-reminders-emailed',
      component: () => import('@/views/borrows/EmailedReminders.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/acquisition',
      name: 'acquisition',
      component: () => import('@/views/acquisition/Acquisition.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/acquisition/create',
      name: 'create-acquisition',
      component: () => import('@/views/acquisition/CreateAcquisition.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin'] },
    },
    {
      path: '/acquisition/edit/:id',
      name: 'edit-acquisition',
      component: () => import('@/views/acquisition/EditAcquisition.vue'),
      props: true,
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin'] },
    },
    {
      path: '/acquisition/view/:id',
      name: 'view-acquisition',
      component: () => import('@/views/acquisition/ViewAcquisitionDetails.vue'),
      props: true,
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/catalogue',
      name: 'catalogue',
      component: () => import('@/views/catalogue/Catalogue.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/catalogue/create',
      name: 'create-catalogue',
      component: () => import('@/views/catalogue/CreateCatalogue.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin'] },
    },
    {
      path: '/catalogue/edit/:id',
      name: 'edit-catalogue',
      component: () => import('@/views/catalogue/EditCatalogue.vue'),
      props: true,
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin'] },
    },
    {
      path: '/catalogue/view/:id',
      name: 'view-catalogue',
      component: () => import('@/views/catalogue/ViewCatalogueDetails.vue'),
      props: true,
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/acquisition/view/:id',
      name: 'view-acquisition',
      component: () => import('@/views/acquisition/ViewAcquisitionDetails.vue'),
      props: true,
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/procurement',
      name: 'procurement',
      component: () => import('@/views/procurement/Procurement.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/procurement/create',
      name: 'create-procurement',
      component: () => import('@/views/procurement/CreateProcurement.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/procurement/edit/:id',
      name: 'edit-procurement',
      component: () => import('@/views/procurement/EditProcurement.vue'),
      props: true,
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/procurement/:id',
      name: 'view-procurement',
      component: () => import('@/views/procurement/ViewProcurementDetails.vue'),
      props: true,
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/semesters',
      name: 'semester-management',
      component: () => import('@/views/semesters/SemesterManagement.vue'),
      meta: { requiresAuth: true, roles: ['super_admin'] },
    },
    {
      path: '/semesters/view/:id',
      name: 'view-semester',
      component: () => import('@/views/semesters/ViewSemesterDetails.vue'),
      props: true,
      meta: { requiresAuth: true, roles: ['super_admin'] },
    },
    {
      path: '/semesters/create',
      name: 'create-semester',
      component: () => import('@/views/semesters/CreateSemester.vue'),
      meta: { requiresAuth: true, roles: ['super_admin'] },
    },
    {
      path: '/semesters/edit/:id',
      name: 'edit-semester',
      component: () => import('@/views/semesters/EditSemester.vue'),
      props: true,
      meta: { requiresAuth: true, roles: ['super_admin'] },
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('@/views/chat/Chat.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin', 'admin'] },
    },
    {
      path: '/branch',
      name: 'branch-management',
      component: () => import('@/views/branch/Branch.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin'] },
    },
    {
      path: '/branch/create',
      name: 'create-branch',
      component: () => import('@/views/branch/CreateBranch.vue'),
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin'] },
    },
    {
      path: '/branch/edit/:id',
      name: 'edit-branch',
      component: () => import('@/views/branch/EditBranch.vue'),
      props: true,
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin'] },
    },
    {
      path: '/branch/view/:id',
      name: 'view-branch',
      component: () => import('@/views/branch/ViewBranchDetails.vue'),
      props: true,
      meta: { requiresAuth: true, roles: ['super_admin', 'branch_admin'] },
    },
    
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
      // Redirect unauthenticated users silently to login
      console.warn('Redirecting to login: unauthenticated');
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
        // Extra employee_type-based restrictions
        const employeeType = session.employee_type || null;

        // Deans cannot access borrow/return/extension/records routes
        const deanBlockedRouteNames = new Set(['borrow-books', 'return-books', 'borrow-extensions', 'records']);
        if (employeeType === 'dean' && deanBlockedRouteNames.has(to.name)) {
          console.warn('Access denied for dean to route:', to.name);
          return next({ name: 'home' });
        }

        return next();
      }
      // not authorized -> show dialog and redirect to login (or a 403 page)
      console.warn(`Access denied: role '${role}' not allowed for route '${to.name || to.path}'.`);
      return next({ name: 'login' });
    }

    return next();
  }

  // No auth required
  return next();
});
