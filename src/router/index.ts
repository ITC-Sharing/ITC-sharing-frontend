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
        component: () => import('@/views/DocumentView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'documents/details',
        name: 'document-details',
        component: () => import('@/views/DocumentDetailsView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'books',
        name: 'books',
        component: () => import('@/views/BookView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: 'dep/:slug',
        name: 'department',
        component: () => import('@/views/DepartmentView.vue'),
        props: true,
        meta: { requiresAuth: true },
      },
      {
        path: 'department/:slug/year/:year',
        name: 'subjects',
        component: () => import('@/views/SubjectsView.vue'),
        props: true,
        meta: { requiresAuth: true },
      },
      {
        path: 'department/:slug/year/:year/subject/:subjectId',
        name: 'subject-documents',
        component: () => import('@/views/DocumentsView.vue'),
        props: true,
        meta: { requiresAuth: true },
      },
    ],
  },

  // ── Admin (no layout — has its own sidebar) ───────────────────────────────
  {
    path: '/admin/dashboard',
    name: 'admin',
    component: () => import('@/views/AdminDashboardView.vue'),
    meta: { requiresAdmin: true },
  },
  {
    path: '/admin/review/:groupId',
    name: 'admin-review',
    component: () => import('@/views/AdminDocumentReviewView.vue'),
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
        component: () => import('@/views/LoginView.vue'),
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('@/views/RegisterView.vue'),
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

  if (to.meta.requiresAdmin && auth.user?.role !== 'admin') {
    return { name: 'home' }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'home' }
  }
})

export default router
