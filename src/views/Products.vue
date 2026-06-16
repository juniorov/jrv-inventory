<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { subscribeToCollection, createDocument, updateDocument, deleteDocument, formatCurrency } from '../utils/helpers'
import PageHeader from '../components/PageHeader.vue'
import Modal from '../components/Modal.vue'
import EmptyState from '../components/EmptyState.vue'
import DeleteConfirm from '../components/DeleteConfirm.vue'

const auth = useAuthStore()
const products = ref([])
const showModal = ref(false)
const editing = ref(null)
const showDelete = ref(false)
const deletingId = ref(null)
const saving = ref(false)
const loading = ref(true)

const form = ref({ name: '', price: 0 })

let unsubscribe

onMounted(() => {
  unsubscribe = subscribeToCollection(auth.companyId, 'products', (items) => {
    products.value = items
    loading.value = false
  })
})

onUnmounted(() => unsubscribe?.())

function resetForm() {
  form.value = { name: '', price: 0 }
  editing.value = null
}

function openCreate() {
  resetForm()
  showModal.value = true
}

function openEdit(product) {
  editing.value = product.id
  form.value = { name: product.name, price: product.price || 0 }
  showModal.value = true
}

async function save() {
  if (!form.value.name.trim() || !form.value.price) return
  saving.value = true
  try {
    if (editing.value) {
      await updateDocument(auth.companyId, 'products', editing.value, form.value)
    } else {
      await createDocument(auth.companyId, 'products', form.value)
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
  await deleteDocument(auth.companyId, 'products', deletingId.value)
  showDelete.value = false
  deletingId.value = null
}
</script>

<template>
  <div>
    <PageHeader
      title="Productos"
      description="Gestiona tus productos"
      :showButton="true"
      buttonText="Nuevo producto"
      buttonIcon="➕"
      @action="openCreate"
    />

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-2xl bg-gray-200"></div>
    </div>

    <EmptyState
      v-else-if="!products.length"
      icon="📦"
      title="No hay productos"
      description="Agrega tu primer producto"
      actionText="Agregar producto"
      @action="openCreate"
    />

    <div v-else class="space-y-3">
      <div
        v-for="product in products"
        :key="product.id"
        class="flex items-center justify-between rounded-2xl border bg-white p-4 shadow-sm"
      >
        <div class="min-w-0 flex-1">
          <h3 class="font-semibold text-gray-900">{{ product.name }}</h3>
          <p class="mt-1 text-sm text-emerald-600 font-medium">{{ formatCurrency(product.price) }}</p>
        </div>
        <div class="flex items-center gap-2 ml-3">
          <button @click="openEdit(product)" class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            ✏️
          </button>
          <button @click="confirmDelete(product.id)" class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
            🗑️
          </button>
        </div>
      </div>
    </div>

    <Modal :open="showModal" :title="editing ? 'Editar producto' : 'Nuevo producto'" @close="showModal = false">
      <form @submit.prevent="save" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Nombre *</label>
          <input v-model="form.name" type="text" required placeholder="Nombre del producto"
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Precio *</label>
          <div class="relative mt-1">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
            <input v-model="form.price" type="number" step="0.01" min="0" required placeholder="0.00"
              class="block w-full rounded-xl border border-gray-300 px-4 py-3 pl-8 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          </div>
        </div>
        <div class="flex gap-3 pt-2">
          <button type="button" @click="showModal = false"
            class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" :disabled="saving || !form.name.trim() || !form.price"
            class="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </Modal>

    <DeleteConfirm
      :open="showDelete"
      title="¿Eliminar producto?"
      message="Este producto será eliminado permanentemente."
      @close="showDelete = false"
      @confirm="remove"
    />
  </div>
</template>
