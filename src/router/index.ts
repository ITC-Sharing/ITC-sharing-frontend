import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/UserLayout.vue'),
      children: [
        {path: '', name: 'home', component: () => import('@/views/HomeView.vue')},
        {path: 'documents', name: 'documents', component: () => import('@/views/DocumentView.vue')},
        {path: 'books', name: 'books', component: () => import('@/views/BookView.vue')},
        {path: 'login', name: 'login', component: () => import('@/views/LoginView.vue')},
        {path: 'register', name: 'register', component: () => import('@/views/RegisterView.vue')}
      ]
    },
  
  ],
})

export default router
