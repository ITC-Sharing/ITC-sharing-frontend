import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const routes = [
  // ── Main layout ───────────────────────────────────────────────────────────
  {
    path: '/',
    component: () => import('@/layouts/UserLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/HomeView.vue'),
      },
      {
        path: 'documents',
        name: 'documents',
        component: () => import('@/views/documents/DocumentInNavView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/ProfileView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'documents/details',
        name: 'document-details',
        component: () => import('@/views/documents/DocumentDetailsView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'notifications',
        name: 'notifications',
        component: () => import('@/views/notifications/NotificationsView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'notifications/detail',
        name: 'notification-detail',
        component: () => import('@/views/notifications/NotificationDetailView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'books',
        name: 'books',
        component: () => import('@/views/books/BookView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'books/:id',
        name: 'book-detail',
        component: () => import('@/views/books/BookDetailView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'dashboard',
        component: () => import('@/views/dashboard/user/DashboardView.vue'),
        meta: { requiresAuth: true },
        children: [
          {
            path: '',
            name: 'dashboard',
            component: () => import('@/views/dashboard/user/DashboardActivity.vue'),
          },
          {
            path: 'documents',
            name: 'dashboard-documents',
            component: () => import('@/views/dashboard/user/DashboardDocuments.vue'),
          },
          {
            path: 'books',
            name: 'dashboard-books',
            component: () => import('@/views/dashboard/user/DashboardBooks.vue'),
          },
        ],
      },
      {
        path: 'dep/:slug',
        name: 'department',
        component: () => import('@/views/dapartment/DepartmentView.vue'),
        props: true,
        meta: { requiresAuth: true },
      },
      {
        path: 'department/:slug/year/:year',
        name: 'subjects',
        component: () => import('@/views/subject/SubjectsView.vue'),
        props: true,
        meta: { requiresAuth: true },
      },
      {
        path: 'department/:slug/year/:year/subject/:subjectId',
        name: 'subject-documents',
        component: () => import('@/views/documents/DocumentsView.vue'),
        props: true,
        meta: { requiresAuth: true },
      },
      {
        // English & French have no subjects — documents live directly under a level.
        path: 'department/:slug/year/:year/documents',
        name: 'level-documents',
        component: () => import('@/views/documents/DocumentsView.vue'),
        props: true,
        meta: { requiresAuth: true },
      },
    ],
  },

  // ── Admin (no layout — has its own sidebar) ───────────────────────────────
  {
    path: '/admin/dashboard',
    name: 'admin',
    component: () => import('@/views/dashboard/admin/AdminDashboardView.vue'),
    meta: { requiresAdmin: true },
  },
  {
    path: '/admin/review/:groupId',
    name: 'admin-review',
    component: () => import('@/views/dashboard/admin/AdminDocumentReviewView.vue'),
    meta: { requiresAdmin: true },
  },

  // ── Auth layout ───────────────────────────────────────────────────────────
  {
    path: '/auth',
    component: () => import('@/layouts/UserAuthLayout.vue'),
    meta: { guestOnly: true },
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/views/auth/LoginView.vue'),
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('@/views/auth/RegisterView.vue'),
      },
    ],
  },

  // ── 404 ───────────────────────────────────────────────────────────────────
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  if ((to.meta.requiresAuth || to.meta.requiresAdmin) && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.requiresAdmin && auth.user?.role?.toLowerCase() !== 'admin') {
    return { name: 'home' }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'home' }
  }
})

export default router
