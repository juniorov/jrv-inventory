import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { getRedirectResult } from 'firebase/auth'
import { auth } from './firebase'
import { useAuthStore } from './stores/auth'

async function boot() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)

  // Handle redirect result BEFORE anything else
  try {
    await getRedirectResult(auth)
  } catch {
    // Ignore — user may just not be coming from a redirect
  }

  const authStore = useAuthStore()
  await authStore.init()

  app.use(router)
  await router.isReady()
  app.mount('#app')
}

boot()
