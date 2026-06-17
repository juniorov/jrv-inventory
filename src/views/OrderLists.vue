<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { subscribeToCollection, createDocument, updateDocument, deleteDocument, timestampToDate } from '../utils/helpers'
import PageHeader from '../components/PageHeader.vue'
import Modal from '../components/Modal.vue'
import EmptyState from '../components/EmptyState.vue'
import DeleteConfirm from '../components/DeleteConfirm.vue'

const auth = useAuthStore()
const router = useRouter()
const lists = ref([])
const orders = ref([])
const showModal = ref(false)
const editing = ref(null)
const showDelete = ref(false)
const deletingId = ref(null)
const saving = ref(false)
const loading = ref(true)

const form = ref({ date: new Date().toISOString().split('T')[0], notes: '' })

let unsubLists, unsubOrders

onMounted(() => {
  unsubLists = subscribeToCollection(auth.companyId, 'orderLists', (items) => {
    lists.value = items
    loading.value = false
  })
  unsubOrders = subscribeToCollection(auth.companyId, 'orders', (items) => {
    orders.value = items
  })
})

onUnmounted(() => {
  unsubLists?.()
  unsubOrders?.()
})

function listHasPending(listId) {
  const listOrders = orders.value.filter(o => o.orderListId === listId)
  return listOrders.some(o => {
    const paid = (o.payments || []).reduce((s, p) => s + (p.amount || 0), 0)
    return paid < (o.total || 0)
  })
}

function pendingCount(listId) {
  return orders.value.filter(o => {
    if (o.orderListId !== listId) return false
    const paid = (o.payments || []).reduce((s, p) => s + (p.amount || 0), 0)
    return paid < (o.total || 0)
  }).length
}

function resetForm() {
  form.value = { date: new Date().toISOString().split('T')[0], notes: '' }
  editing.value = null
}

function openCreate() {
  resetForm()
  showModal.value = true
}

function openEdit(list) {
  editing.value = list.id
  form.value = { date: list.date || new Date().toISOString().split('T')[0], notes: list.notes || '' }
  showModal.value = true
}

async function save() {
  if (!form.value.date) return
  saving.value = true
  try {
    if (editing.value) {
      await updateDocument(auth.companyId, 'orderLists', editing.value, form.value)
    } else {
      await createDocument(auth.companyId, 'orderLists', form.value)
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
  await deleteDocument(auth.companyId, 'orderLists', deletingId.value)
  showDelete.value = false
  deletingId.value = null
}
</script>

<template>
  <div>
    <PageHeader
      title="Listas de Pedidos"
      description="Agrupa pedidos por fecha"
      :showButton="true"
      buttonText="Nueva lista"
      buttonIcon="➕"
      @action="openCreate"
    />

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-2xl bg-gray-200"></div>
    </div>

    <EmptyState
      v-else-if="!lists.length"
      icon="📋"
      title="No hay listas de pedidos"
      description="Crea una lista para agrupar pedidos por fecha"
      actionText="Crear lista"
      @action="openCreate"
    />

    <div v-else class="space-y-3">
      <div
        v-for="list in lists"
        :key="list.id"
        class="flex items-center justify-between rounded-2xl border bg-white p-4 shadow-sm"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-gray-900">{{ list.date || 'Sin fecha' }}</h3>
            <span
              v-if="listHasPending(list.id)"
              class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>
              {{ pendingCount(list.id) }} pendiente{{ pendingCount(list.id) !== 1 ? 's' : '' }}
            </span>
            <span
              v-else
              class="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
            >
              Pagado
            </span>
          </div>
          <p v-if="list.notes" class="mt-1 text-sm text-gray-500 truncate">{{ list.notes }}</p>
          <p class="mt-1 text-xs text-gray-400">
            {{ list.createdAt ? timestampToDate(list.createdAt) : '' }}
          </p>
        </div>
        <div class="flex items-center gap-2 ml-3">
          <button @click="router.push(`/order-lists/${list.id}`)" class="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100">
            Ver pedidos
          </button>
          <button @click="openEdit(list)" class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            ✏️
          </button>
          <button @click="confirmDelete(list.id)" class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
            🗑️
          </button>
        </div>
      </div>
    </div>

    <Modal :open="showModal" :title="editing ? 'Editar lista' : 'Nueva lista de pedidos'" @close="showModal = false">
      <form @submit.prevent="save" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Fecha *</label>
          <input v-model="form.date" type="date" required
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Notas</label>
          <textarea v-model="form.notes" rows="2" placeholder="Notas opcionales"
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"></textarea>
        </div>
        <div class="flex gap-3 pt-2">
          <button type="button" @click="showModal = false"
            class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" :disabled="saving || !form.date"
            class="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </Modal>

    <DeleteConfirm
      :open="showDelete"
      title="¿Eliminar lista?"
      message="Esta lista y todos sus pedidos serán eliminados."
      @close="showDelete = false"
      @confirm="remove"
    />
  </div>
</template>
