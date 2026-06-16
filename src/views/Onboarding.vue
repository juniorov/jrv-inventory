<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const companyName = ref('')
const loading = ref(false)
const error = ref('')

async function handleCreate() {
  if (!companyName.value.trim()) return
  loading.value = true
  error.value = ''
  try {
    await auth.createCompany(companyName.value.trim())
    router.push('/')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-800 px-4">
    <div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
      <div class="mb-6 text-center">
        <h1 class="text-2xl font-bold text-gray-900">Crear Empresa</h1>
        <p class="mt-1 text-sm text-gray-500">Ingresa el nombre de tu empresa para comenzar</p>
      </div>

      <form @submit.prevent="handleCreate" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Nombre de la empresa</label>
          <input
            v-model="companyName"
            type="text"
            required
            placeholder="Ej: JRV Cocina"
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder-gray-400 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading || !companyName.trim()"
          class="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ loading ? 'Creando...' : 'Crear empresa' }}
        </button>
      </form>

      <div class="mt-6 text-center">
        <p class="text-sm text-gray-500">
          ¿Tienes un link de invitación?
          <router-link to="/invite/test" class="font-medium text-emerald-600 hover:text-emerald-700">Aceptar invitación</router-link>
        </p>
      </div>
    </div>
  </div>
</template>
