import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../firebase/index'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { guest: true },
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('../views/Onboarding.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/join/:code',
    name: 'JoinCompany',
    component: () => import('../views/JoinCompany.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/',
    component: () => import('../layouts/Default.vue'),
    meta: { requiresAuth: true, requiresCompany: true },
    children: [
      { path: '', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
      { path: 'clients', name: 'Clients', component: () => import('../views/Clients.vue') },
      { path: 'products', name: 'Products', component: () => import('../views/Products.vue') },
      { path: 'order-lists', name: 'OrderLists', component: () => import('../views/OrderLists.vue') },
      { path: 'order-lists/:id', name: 'OrderListDetail', component: () => import('../views/OrderListDetail.vue') },
      { path: 'batches', name: 'Batches', component: () => import('../views/Batches.vue') },
      { path: 'payments', name: 'Payments', component: () => import('../views/Payments.vue') },
      { path: 'expenses', name: 'Expenses', component: () => import('../views/Expenses.vue') },
      { path: 'incomes', name: 'Incomes', component: () => import('../views/Incomes.vue') },
      { path: 'settings', name: 'Settings', component: () => import('../views/Settings.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const user = auth.currentUser
  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  const requiresCompany = to.matched.some((r) => r.meta.requiresCompany)
  const isGuest = to.matched.some((r) => r.meta.guest)

  if (!user && requiresAuth) {
    next('/login')
  } else if (user && isGuest) {
    next('/')
  } else if (user && requiresCompany) {
    const authStore = useAuthStore()
    if (!authStore.hasCompany) {
      next('/onboarding')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
