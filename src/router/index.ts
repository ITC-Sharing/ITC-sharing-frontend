import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  // Public pages
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
      },
      {
        path: 'books',
        name: 'books',
        component: () => import('@/views/BookView.vue'),
      },
    ],
  },

  // Auth pages
  {
    path: '/auth',
    component: () => import('@/layouts/UserAuthLayout.vue'),
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

  {
    path: '/dep',
    component: () => import('@/layouts/UserLayout.vue'),
    children: [
      {
        path: ':slug', // dynamic parameter
        name: 'department', // generic name
        component: () => import('@/views/DepartmentView.vue'),
        props: true, // passes route params as props
      },
    ],
  },

  // 404 page
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

export default router
