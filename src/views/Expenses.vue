<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import {
  subscribeToCollection, createDocument, deleteDocument, formatCurrency,
  timestampToDate
} from '../utils/helpers'
import PageHeader from '../components/PageHeader.vue'
import Modal from '../components/Modal.vue'
import EmptyState from '../components/EmptyState.vue'
import DeleteConfirm from '../components/DeleteConfirm.vue'

const auth = useAuthStore()
const expenses = ref([])
const showModal = ref(false)
const showDelete = ref(false)
const deletingId = ref(null)
const saving = ref(false)
const loading = ref(true)

const form = ref({ concept: '', amount: 0, date: new Date().toISOString().split('T')[0], category: '' })

let unsubscribe

onMounted(() => {
  unsubscribe = subscribeToCollection(auth.companyId, 'expenses', (items) => {
    expenses.value = items
    loading.value = false
  })
})

onUnmounted(() => unsubscribe?.())

const totalExpenses = ref(0)

function resetForm() {
  form.value = { concept: '', amount: 0, date: new Date().toISOString().split('T')[0], category: '' }
}

function openCreate() {
  resetForm()
  showModal.value = true
}

async function save() {
  if (!form.value.concept.trim() || !form.value.amount) return
  saving.value = true
  try {
    await createDocument(auth.companyId, 'expenses', {
      concept: form.value.concept.trim(),
      amount: Number(form.value.amount),
      date: form.value.date,
      category: form.value.category,
    })
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
  await deleteDocument(auth.companyId, 'expenses', deletingId.value)
  showDelete.value = false
  deletingId.value = null
}
</script>

<template>
  <div>
    <PageHeader
      title="Gastos"
      description="Registra los gastos"
      :showButton="true"
      buttonText="Nuevo gasto"
      buttonIcon="➕"
      @action="openCreate"
    />

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-2xl bg-gray-200"></div>
    </div>

    <EmptyState
      v-else-if="!expenses.length"
      icon="💸"
      title="No hay gastos registrados"
      description="Registra tus gastos para llevar el control"
      actionText="Registrar gasto"
      @action="openCreate"
    />

    <div v-else class="space-y-3">
      <div
        v-for="expense in expenses"
        :key="expense.id"
        class="flex items-center justify-between rounded-2xl border bg-white p-4 shadow-sm"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-gray-900">{{ expense.concept }}</h3>
            <span v-if="expense.category" class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {{ expense.category }}
            </span>
          </div>
          <p class="mt-1 text-sm text-gray-500">{{ expense.date || timestampToDate(expense.createdAt) }}</p>
        </div>
        <div class="flex items-center gap-3 ml-3">
          <span class="font-semibold text-red-600">{{ formatCurrency(expense.amount) }}</span>
          <button @click="confirmDelete(expense.id)" class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
            🗑️
          </button>
        </div>
      </div>

      <div class="rounded-2xl border bg-red-50 p-4">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-gray-900">Total gastos</span>
          <span class="text-xl font-bold text-red-700">
            {{ formatCurrency(expenses.reduce((s, e) => s + (e.amount || 0), 0)) }}
          </span>
        </div>
      </div>
    </div>

    <Modal :open="showModal" title="Nuevo gasto" @close="showModal = false">
      <form @submit.prevent="save" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Concepto *</label>
          <input v-model="form.concept" type="text" required placeholder="Ej: Compra de ingredientes"
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Categoría</label>
          <input v-model="form.category" type="text" placeholder="Ej: Insumos, Servicios"
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Monto *</label>
          <div class="relative mt-1">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
            <input v-model.number="form.amount" type="number" step="0.01" min="0" required placeholder="0.00"
              class="block w-full rounded-xl border border-gray-300 px-4 py-3 pl-8 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Fecha</label>
          <input v-model="form.date" type="date"
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <div class="flex gap-3 pt-2">
          <button type="button" @click="showModal = false"
            class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" :disabled="saving || !form.concept.trim() || !form.amount"
            class="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </Modal>

    <DeleteConfirm
      :open="showDelete"
      title="¿Eliminar gasto?"
      message="Este gasto será eliminado permanentemente."
      @close="showDelete = false"
      @confirm="remove"
    />
  </div>
</template>
