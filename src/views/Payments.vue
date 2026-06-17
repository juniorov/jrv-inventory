<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import {
  subscribeToCollection, createDocument, formatCurrency,
} from '../utils/helpers'
import PageHeader from '../components/PageHeader.vue'
import Modal from '../components/Modal.vue'
import EmptyState from '../components/EmptyState.vue'

const auth = useAuthStore()
const payments = ref([])
const clients = ref([])
const orders = ref([])
const showModal = ref(false)
const saving = ref(false)
const loading = ref(true)
const selectedClientId = ref('')

const form = ref({ clientId: '', amount: 0, date: new Date().toISOString().split('T')[0], notes: '' })

let unsubPayments, unsubClients, unsubOrders

onMounted(() => {
  unsubPayments = subscribeToCollection(auth.companyId, 'payments', (items) => {
    payments.value = items
    loading.value = false
  })
  unsubClients = subscribeToCollection(auth.companyId, 'clients', (items) => {
    clients.value = items.sort((a, b) => a.name.localeCompare(b.name))
  })
  unsubOrders = subscribeToCollection(auth.companyId, 'orders', (items) => {
    orders.value = items
  })
})

onUnmounted(() => {
  unsubPayments?.()
  unsubClients?.()
  unsubOrders?.()
})

const clientBalances = computed(() => {
  return clients.value.map(client => {
    const totalOrders = orders.value
      .filter(o => o.clientId === client.id)
      .reduce((s, o) => s + (o.total || 0), 0)

    const totalPayments = payments.value
      .filter(p => p.clientId === client.id)
      .reduce((s, p) => s + (p.amount || 0), 0)

    const balance = totalOrders - totalPayments

    return {
      ...client,
      totalOrders,
      totalPayments,
      balance,
      status: balance <= 0 ? 'Completo' : balance < totalOrders ? 'Parcial' : 'Pendiente',
    }
  })
})

const filteredClients = computed(() => {
  if (!selectedClientId.value) return clientBalances.value
  return clientBalances.value.filter(c => c.id === selectedClientId.value)
})

function resetForm() {
  form.value = { clientId: '', amount: 0, date: new Date().toISOString().split('T')[0], notes: '' }
}

function openCreate() {
  resetForm()
  showModal.value = true
}

async function save() {
  if (!form.value.clientId || !form.value.amount) return
  saving.value = true
  try {
    await createDocument(auth.companyId, 'payments', {
      clientId: form.value.clientId,
      amount: Number(form.value.amount),
      date: form.value.date,
      notes: form.value.notes,
    })
    showModal.value = false
    resetForm()
  } finally {
    saving.value = false
  }
}

function statusColor(status) {
  if (status === 'Completo') return 'bg-emerald-100 text-emerald-700'
  if (status === 'Parcial') return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}
</script>

<template>
  <div>
    <PageHeader
      title="Pagos"
      description="Control de pagos por cliente"
      :showButton="true"
      buttonText="Registrar pago"
      buttonIcon="➕"
      @action="openCreate"
    />

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-2xl bg-gray-200"></div>
    </div>

    <EmptyState
      v-else-if="!clients.length"
      icon="💳"
      title="No hay clientes"
      description="Primero agrega clientes para registrar pagos"
    />

    <div v-else class="space-y-3">
      <div class="mb-4">
        <select v-model="selectedClientId"
          class="block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200">
          <option value="">Todos los clientes</option>
          <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div
        v-for="client in filteredClients"
        :key="client.id"
        class="rounded-2xl border bg-white p-4 shadow-sm"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-gray-900">{{ client.name }}</h3>
          <span :class="['rounded-full px-3 py-1 text-xs font-medium', statusColor(client.status)]">
            {{ client.status }}
          </span>
        </div>
        <div class="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p class="text-gray-500">Pedidos</p>
            <p class="font-semibold text-gray-900">{{ formatCurrency(client.totalOrders) }}</p>
          </div>
          <div>
            <p class="text-gray-500">Pagado</p>
            <p class="font-semibold text-emerald-600">{{ formatCurrency(client.totalPayments) }}</p>
          </div>
          <div>
            <p class="text-gray-500">Saldo</p>
            <p :class="['font-semibold', client.balance <= 0 ? 'text-emerald-600' : 'text-red-600']">
              {{ formatCurrency(client.balance) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <Modal :open="showModal" title="Registrar pago" @close="showModal = false">
      <form @submit.prevent="save" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Cliente *</label>
          <select v-model="form.clientId" required
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200">
            <option value="" disabled>Seleccionar cliente</option>
            <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Monto *</label>
          <div class="relative mt-1">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">₡</span>
            <input v-model.number="form.amount" type="number" step="0.01" min="0" required placeholder="0.00"
              class="block w-full rounded-xl border border-gray-300 px-4 py-3 pl-8 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Fecha</label>
          <input v-model="form.date" type="date"
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Notas</label>
          <input v-model="form.notes" type="text" placeholder="Notas opcionales"
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <div class="flex gap-3 pt-2">
          <button type="button" @click="showModal = false"
            class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" :disabled="saving || !form.clientId || !form.amount"
            class="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
