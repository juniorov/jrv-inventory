<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { updateDocument } from '../utils/helpers'

const auth = useAuthStore()
const router = useRouter()
const saving = ref(false)
const message = ref('')

const form = ref({
  name: auth.company?.name || '',
})

async function save() {
  if (!form.name.trim()) return
  saving.value = true
  message.value = ''
  try {
    await updateDocument(null, 'companies', auth.companyId, { name: form.name.trim() })
    auth.company.name = form.name.trim()
    message.value = 'Guardado correctamente'
  } catch (e) {
    message.value = 'Error al guardar'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-bold text-gray-900">Configuración</h1>

    <div class="space-y-6">
      <div class="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 class="mb-4 text-lg font-semibold text-gray-900">Empresa</h2>
        <form @submit.prevent="save" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre de la empresa</label>
            <input v-model="form.name" type="text" required
              class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          </div>
          <button type="submit" :disabled="saving"
            class="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
          <p v-if="message" class="text-sm font-medium text-emerald-600">{{ message }}</p>
        </form>
      </div>

      <div class="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 class="mb-4 text-lg font-semibold text-gray-900">Equipo</h2>
        <p class="mb-4 text-sm text-gray-500">Gestiona los miembros de tu empresa y genera invitaciones.</p>
        <div class="flex flex-wrap gap-3">
          <button @click="router.push('/members')"
            class="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">
            Gestionar socios
          </button>
          <button @click="router.push('/invitations')"
            class="rounded-xl border border-emerald-600 px-5 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
            Invitaciones
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
