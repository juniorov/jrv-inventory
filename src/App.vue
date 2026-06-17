<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()

const installPrompt = ref(null)
const showInstallBanner = ref(false)

function handleBeforeInstallPrompt(e) {
  e.preventDefault()
  installPrompt.value = e
  showInstallBanner.value = true
}

function handleAppInstalled() {
  showInstallBanner.value = false
  installPrompt.value = null
}

async function installApp() {
  if (!installPrompt.value) return
  installPrompt.value.prompt()
  const { outcome } = await installPrompt.value.userChoice
  if (outcome === 'accepted') showInstallBanner.value = false
  installPrompt.value = null
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('appinstalled', handleAppInstalled)
})
</script>

<template>
  <div v-if="auth.loading" class="flex h-dvh items-center justify-center bg-emerald-600">
    <div class="text-center">
      <div class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
      <p class="text-lg font-medium text-white">Cargando...</p>
    </div>
  </div>
  <router-view v-else />

  <!-- Install banner -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="showInstallBanner"
      class="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-80"
    >
      <div class="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600">
          <span class="text-lg font-bold text-white">J</span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold leading-tight text-gray-900">Instalar JRV Inventory</p>
          <p class="mt-0.5 text-xs text-gray-500">Acceso rápido desde tu pantalla de inicio</p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <button
            type="button"
            class="rounded-lg p-1 text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
            @click="showInstallBanner = false"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <button
            type="button"
            class="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            @click="installApp"
          >
            Instalar
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
