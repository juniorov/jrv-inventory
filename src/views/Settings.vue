<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { updateDocument } from '../utils/helpers'

const auth = useAuthStore()
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

function copyCode() {
  if (auth.company?.invitationCode) {
    navigator.clipboard.writeText(auth.company.invitationCode)
    message.value = '¡Código copiado!'
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
        <h2 class="mb-4 text-lg font-semibold text-gray-900">Invitación</h2>
        <p class="mb-3 text-sm text-gray-500">Comparte este código para invitar administradores:</p>
        <div class="flex items-center gap-3">
          <code class="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-lg font-bold tracking-wider text-emerald-700">
            {{ auth.company?.invitationCode || '---' }}
          </code>
          <button @click="copyCode"
            class="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700">
            Copiar
          </button>
        </div>
        <p class="mt-2 text-sm text-gray-400">
          Link: {{ `${location.origin}/join/${auth.company?.invitationCode}` }}
        </p>
      </div>
    </div>
  </div>
</template>
