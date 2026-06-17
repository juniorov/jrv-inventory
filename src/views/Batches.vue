<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import {
  subscribeToCollection, createDocument, updateDocument, deleteDocument, formatCurrency,
  timestampToDate
} from '../utils/helpers'
import PageHeader from '../components/PageHeader.vue'
import Modal from '../components/Modal.vue'
import EmptyState from '../components/EmptyState.vue'
import DeleteConfirm from '../components/DeleteConfirm.vue'

const auth = useAuthStore()
const batches = ref([])
const orderLists = ref([])
const orders = ref([])
const showModal = ref(false)
const showDelete = ref(false)
const deletingId = ref(null)
const editingBatch = ref(null)
const saving = ref(false)
const loading = ref(true)
const form = ref({ date: new Date().toISOString().split('T')[0], orderListId: '', totalCost: 0, notes: '' })

let unsubBatches, unsubOrderLists, unsubOrders

onMounted(() => {
  unsubBatches = subscribeToCollection(auth.companyId, 'batches', (items) => {
    batches.value = items
    loading.value = false
  })
  unsubOrderLists = subscribeToCollection(auth.companyId, 'orderLists', (items) => {
    orderLists.value = items
  })
  unsubOrders = subscribeToCollection(auth.companyId, 'orders', (items) => {
    orders.value = items
  })
})

onUnmounted(() => {
  unsubBatches?.()
  unsubOrderLists?.()
  unsubOrders?.()
})

function getOrderListIncome(orderListId) {
  if (!orderListId) return 0
  return orders.value
    .filter(o => o.orderListId === orderListId)
    .reduce((sum, o) => sum + (o.total || 0), 0)
}

function getOrderListDate(id) {
  return orderLists.value.find(o => o.id === id)?.date || 'N/A'
}

function resetForm() {
  form.value = { date: new Date().toISOString().split('T')[0], orderListId: '', totalCost: 0, notes: '' }
  editingBatch.value = null
}

function openCreate() {
  resetForm()
  showModal.value = true
}

function openEdit(batch) {
  editingBatch.value = batch
  form.value = {
    date: batch.date,
    orderListId: batch.orderListId || '',
    totalCost: batch.totalCost || 0,
    notes: batch.notes || '',
  }
  showModal.value = true
}

async function save() {
  if (!form.value.date || !form.value.totalCost) return
  saving.value = true
  try {
    const data = {
      date: form.value.date,
      orderListId: form.value.orderListId,
      totalCost: Number(form.value.totalCost),
      notes: form.value.notes,
    }
    if (editingBatch.value) {
      await updateDocument(auth.companyId, 'batches', editingBatch.value.id, data)
    } else {
      await createDocument(auth.companyId, 'batches', data)
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
  await deleteDocument(auth.companyId, 'batches', deletingId.value)
  showDelete.value = false
  deletingId.value = null
}
</script>

<template>
  <div>
    <PageHeader
      title="Lotes"
      description="Registra los costos de producción por lote"
      :showButton="true"
      buttonText="Nuevo lote"
      buttonIcon="➕"
      @action="openCreate"
    />

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-2xl bg-gray-200"></div>
    </div>

    <EmptyState
      v-else-if="!batches.length"
      icon="🏭"
      title="No hay lotes registrados"
      description="Registra los costos de producción por lote"
      actionText="Crear lote"
      @action="openCreate"
    />

    <div v-else class="space-y-3">
      <div
        v-for="batch in batches"
        :key="batch.id"
        class="rounded-2xl border bg-white p-4 shadow-sm"
      >
        <div class="flex items-start justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-gray-900">Lote {{ batch.date }}</h3>
              <span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {{ getOrderListDate(batch.orderListId) }}
              </span>
            </div>
            <p class="mt-1 text-sm font-medium text-red-600">Costo: {{ formatCurrency(batch.totalCost) }}</p>
            <div v-if="batch.orderListId" class="mt-2 space-y-1 border-t border-gray-100 pt-2 text-sm">
              <div class="flex items-center justify-between text-gray-600">
                <span>Ingreso de pedidos</span>
                <span class="font-medium text-emerald-600">{{ formatCurrency(getOrderListIncome(batch.orderListId)) }}</span>
              </div>
              <div class="flex items-center justify-between text-gray-600">
                <span>Costo</span>
                <span class="font-medium text-red-600">- {{ formatCurrency(batch.totalCost) }}</span>
              </div>
              <div class="flex items-center justify-between border-t border-gray-100 pt-1 font-semibold">
                <span>Balance</span>
                <span :class="getOrderListIncome(batch.orderListId) - batch.totalCost >= 0 ? 'text-emerald-600' : 'text-red-600'">
                  {{ formatCurrency(getOrderListIncome(batch.orderListId) - batch.totalCost) }}
                </span>
              </div>
            </div>
            <p v-if="batch.notes" class="mt-1 text-sm text-gray-500">{{ batch.notes }}</p>
          </div>
          <div class="flex items-center gap-1 ml-3">
            <button @click="openEdit(batch)" class="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
              ✏️
            </button>
            <button @click="confirmDelete(batch.id)" class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <Modal :open="showModal" :title="editingBatch ? 'Editar lote' : 'Nuevo lote'" @close="showModal = false">
      <form @submit.prevent="save" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Fecha *</label>
          <input v-model="form.date" type="date" required
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Lista de pedidos</label>
          <select v-model="form.orderListId"
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200">
            <option value="">Sin lista</option>
            <option v-for="list in orderLists" :key="list.id" :value="list.id">{{ list.date }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Costo total *</label>
          <div class="relative mt-1">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">₡</span>
            <input v-model.number="form.totalCost" type="number" step="0.01" min="0" required placeholder="0.00"
              class="block w-full rounded-xl border border-gray-300 px-4 py-3 pl-8 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          </div>
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
          <button type="submit" :disabled="saving || !form.date || !form.totalCost"
            class="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {{ saving ? 'Guardando...' : editingBatch ? 'Guardar cambios' : 'Guardar' }}
          </button>
        </div>
      </form>
    </Modal>

    <DeleteConfirm
      :open="showDelete"
      title="¿Eliminar lote?"
      message="Este registro de lote será eliminado."
      @close="showDelete = false"
      @confirm="remove"
    />
  </div>
</template>
