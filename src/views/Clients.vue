<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { subscribeToCollection, createDocument, updateDocument, deleteDocument } from '../utils/helpers'
import PageHeader from '../components/PageHeader.vue'
import Modal from '../components/Modal.vue'
import EmptyState from '../components/EmptyState.vue'
import DeleteConfirm from '../components/DeleteConfirm.vue'

const auth = useAuthStore()
const clients = ref([])
const showModal = ref(false)
const editing = ref(null)
const showDelete = ref(false)
const deletingId = ref(null)
const saving = ref(false)
const loading = ref(true)
const searchQuery = ref('')

const form = ref({ name: '', phone: '', googleMapsUrl: '' })

let unsubscribe

onMounted(() => {
  unsubscribe = subscribeToCollection(auth.companyId, 'clients', (items) => {
    clients.value = items.sort((a, b) => a.name.localeCompare(b.name))
    loading.value = false
  })
})

onUnmounted(() => unsubscribe?.())

function normalizeText(value = '') {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const filteredClients = computed(() => {
  const query = normalizeText(searchQuery.value)
  if (!query) return clients.value
  return clients.value.filter((client) => normalizeText(client.name).includes(query))
})

function resetForm() {
  form.value = { name: '', phone: '', googleMapsUrl: '' }
  editing.value = null
}

function openCreate() {
  resetForm()
  showModal.value = true
}

function openEdit(client) {
  editing.value = client.id
  form.value = { name: client.name, phone: client.phone || '', googleMapsUrl: client.googleMapsUrl || '' }
  showModal.value = true
}

async function save() {
  if (!form.value.name.trim()) return
  saving.value = true
  try {
    if (editing.value) {
      await updateDocument(auth.companyId, 'clients', editing.value, form.value)
    } else {
      await createDocument(auth.companyId, 'clients', form.value)
    }
    showModal.value = false
    resetForm()
  } finally {
    saving.value = false
  }
}

function confirmDelete(id) {
  deletingId.value = id
  showDelete.value = true
}

async function remove() {
  await deleteDocument(auth.companyId, 'clients', deletingId.value)
  showDelete.value = false
  deletingId.value = null
}
</script>

<template>
  <div>
    <PageHeader
      title="Clientes"
      description="Gestiona tus clientes"
      :showButton="true"
      buttonText="Nuevo cliente"
      buttonIcon="➕"
      @action="openCreate"
    />

    <div v-if="!loading && clients.length" class="mb-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar cliente por nombre..."
        class="block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
      />
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-2xl bg-gray-200"></div>
    </div>

    <EmptyState
      v-else-if="!clients.length"
      icon="👥"
      title="No hay clientes"
      description="Agrega tu primer cliente para comenzar"
      actionText="Agregar cliente"
      @action="openCreate"
    />

    <div v-else class="space-y-3">
      <div
        v-if="!filteredClients.length"
        class="rounded-2xl border border-dashed bg-white p-6 text-center text-sm text-gray-500"
      >
        No se encontraron clientes con ese nombre.
      </div>
      <div
        v-for="client in filteredClients"
        :key="client.id"
        class="flex items-center justify-between rounded-2xl border bg-white p-4 shadow-sm"
      >
        <div class="min-w-0 flex-1">
          <h3 class="font-semibold text-gray-900">{{ client.name }}</h3>
          <div class="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
            <span v-if="client.phone">📞 {{ client.phone }}</span>
            <a
              v-if="client.googleMapsUrl"
              :href="client.googleMapsUrl"
              target="_blank"
              rel="noopener"
              class="text-emerald-600 hover:underline"
            >
              📍 Ver ubicación
            </a>
          </div>
        </div>
        <div class="flex items-center gap-2 ml-3">
          <button @click="openEdit(client)" class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            ✏️
          </button>
          <button @click="confirmDelete(client.id)" class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
            🗑️
          </button>
        </div>
      </div>
    </div>

    <Modal :open="showModal" :title="editing ? 'Editar cliente' : 'Nuevo cliente'" @close="showModal = false">
      <form @submit.prevent="save" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Nombre *</label>
          <input v-model="form.name" type="text" required placeholder="Nombre del cliente"
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Teléfono</label>
          <input v-model="form.phone" type="tel" placeholder="+52 555 123 4567"
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">URL Google Maps</label>
          <input v-model="form.googleMapsUrl" type="url" placeholder="https://maps.app.goo.gl/..."
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <div class="flex gap-3 pt-2">
          <button type="button" @click="showModal = false"
            class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" :disabled="saving || !form.name.trim()"
            class="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </Modal>

    <DeleteConfirm
      :open="showDelete"
      title="¿Eliminar cliente?"
      message="Este cliente será eliminado permanentemente."
      @close="showDelete = false"
      @confirm="remove"
    />
  </div>
</template>
