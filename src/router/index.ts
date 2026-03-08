import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/components/Login.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/UserLayout.vue'),
      children: [
        {path: '', name: 'home', component: () => import('@/views/HomeView.vue')},
        {path: 'documents', name: 'documents', component: () => import('@/views/DocumentView.vue')},
        {path: 'books', name: 'books', component: () => import('@/views/BookView.vue')}
      ]
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
    },
  ],
})

export default router
