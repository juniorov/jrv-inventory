<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const sidebarOpen = ref(false)

const navigation = [
  { name: 'Dashboard', path: '/', icon: '📊' },
  { name: 'Clientes', path: '/clients', icon: '👥' },
  { name: 'Productos', path: '/products', icon: '📦' },
  { name: 'Listas de Pedidos', path: '/order-lists', icon: '📋' },
  { name: 'Lotes', path: '/batches', icon: '🏭' },
  { name: 'Pagos', path: '/payments', icon: '💳' },
  { name: 'Socios', path: '/members', icon: '🤝' },
  { name: 'Invitaciones', path: '/invitations', icon: '🔗' },
]

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <div class="flex h-dvh flex-col">
    <!-- Mobile header -->
    <header class="flex items-center justify-between border-b bg-white px-4 py-3 lg:hidden">
      <button @click="sidebarOpen = !sidebarOpen" class="rounded-lg p-2 hover:bg-gray-100" aria-label="Menú">
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div class="flex items-center gap-2">
        <span class="font-semibold text-emerald-700">{{ auth.company?.name }}</span>
      </div>
      <button @click="handleLogout" class="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Cerrar sesión">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </header>

    <!-- Overlay mobile -->
    <div v-if="sidebarOpen" @click="sidebarOpen = false" class="fixed inset-0 z-20 bg-black/40 lg:hidden"></div>

    <!-- Sidebar -->
    <aside :class="[
      'fixed inset-y-0 left-0 z-30 w-64 transform border-r bg-white transition-transform lg:static lg:translate-x-0',
      sidebarOpen ? 'translate-x-0' : '-translate-x-full'
    ]">
      <div class="flex h-full flex-col">
        <div class="hidden items-center gap-3 border-b px-6 py-5 lg:flex">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white">
            {{ auth.company?.name?.charAt(0) || 'J' }}
          </div>
          <div>
            <p class="font-semibold text-gray-900">{{ auth.company?.name }}</p>
            <p class="text-xs text-gray-500">Control de inventario</p>
          </div>
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto p-4">
          <router-link
            v-for="item in navigation"
            :key="item.path"
            :to="item.path"
            @click="sidebarOpen = false"
            :class="[
              'flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
              isActive(item.path)
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            ]"
          >
            <span class="text-lg">{{ item.icon }}</span>
            {{ item.name }}
          </router-link>
        </nav>

        <div class="border-t p-4">
          <div class="flex items-center gap-3">
            <img
              v-if="auth.user?.photoURL"
              :src="auth.user.photoURL"
              class="h-8 w-8 rounded-full"
              alt="Avatar"
            />
            <div v-else class="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-medium text-emerald-700">
              {{ auth.user?.displayName?.charAt(0) || 'U' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="truncate text-sm font-medium text-gray-900">{{ auth.user?.displayName }}</p>
              <p class="truncate text-xs text-gray-500">{{ auth.user?.email }}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6">
      <router-view />
    </main>
  </div>
</template>
