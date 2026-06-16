<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const code = ref(route.params.code || '')
const loading = ref(false)
const error = ref('')

async function handleJoin() {
  if (!code.value.trim()) return
  loading.value = true
  error.value = ''
  try {
    await auth.joinCompany(code.value.trim())
    router.push('/')
  } catch (e) {
    error.value = 'Código inválido. Verifica e intenta de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-800 px-4">
    <div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
      <div class="mb-6 text-center">
        <h1 class="text-2xl font-bold text-gray-900">Unirse a Empresa</h1>
        <p class="mt-1 text-sm text-gray-500">Ingresa el código de invitación</p>
      </div>

      <form @submit.prevent="handleJoin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Código de invitación</label>
          <input
            v-model="code"
            type="text"
            required
            placeholder="Ej: a1b2c3d4"
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading || !code.trim()"
          class="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ loading ? 'Uniendo...' : 'Unirse' }}
        </button>
      </form>

      <div class="mt-6 text-center">
        <router-link to="/onboarding" class="text-sm font-medium text-emerald-600 hover:text-emerald-700">
          Crear nueva empresa
        </router-link>
      </div>
    </div>
  </div>
</template>
