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
