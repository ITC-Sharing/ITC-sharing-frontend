import { createRouter, createWebHistory } from 'vue-router'
import ButtonPrimary from '@/components/ButtonPrimary.vue'
import Login from '@/components/Login.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/button',
      name: 'button',
      component: ButtonPrimary,
    },
    {
        path: '/login',
        name: 'login',
        component: Login,
    },
    
  ],
})

export default router