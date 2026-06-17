import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('../views/Onboarding.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/invite/:token',
    name: 'Invite',
    component: () => import('../views/Invite.vue'),
    meta: { public: true, skipAuthRedirect: true },
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
      { path: 'delivery-groups', name: 'DeliveryGroups', component: () => import('../views/DeliveryGroups.vue') },
      { path: 'delivery-groups/:id', name: 'DeliveryGroupDetail', component: () => import('../views/DeliveryGroupDetail.vue') },
      { path: 'payments', name: 'Payments', component: () => import('../views/Payments.vue') },
      { path: 'members', name: 'Members', component: () => import('../views/Members.vue') },
      { path: 'invitations', name: 'Invitations', component: () => import('../views/Invitations.vue') },
      { path: 'settings', name: 'Settings', component: () => import('../views/Settings.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const isAuthenticated = authStore.isAuthenticated
  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  const requiresCompany = to.matched.some((r) => r.meta.requiresCompany)
  const isPublic = to.matched.some((r) => r.meta.public)
  const skipAuthRedirect = to.matched.some((r) => r.meta.skipAuthRedirect)

  if (isPublic && isAuthenticated && !skipAuthRedirect) {
    return next('/')
  }

  if (!isAuthenticated && requiresAuth) {
    return next('/login')
  }

  if (isAuthenticated && requiresCompany) {
    if (!authStore.hasCompany) {
      return next('/onboarding')
    }
  }

  // Pending invite redirect after login
  const pendingInvite = sessionStorage.getItem('pendingInvite')
  if (pendingInvite && to.name !== 'Invite') {
    sessionStorage.removeItem('pendingInvite')
    return next({ name: 'Invite', params: { token: pendingInvite } })
  }

  next()
})

export default router
