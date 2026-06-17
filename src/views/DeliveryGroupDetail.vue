<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  subscribeToCollection, getDocRef,
  formatCurrency, getCollectionRef,
} from '../utils/helpers'
import { doc, getDoc, updateDoc, addDoc } from 'firebase/firestore'
import { db } from '../firebase/index'
import Modal from '../components/Modal.vue'
import SearchSelect from '../components/SearchSelect.vue'
import EmptyState from '../components/EmptyState.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const groupId = route.params.id

const group = ref(null)
const clients = ref([])
const orders = ref([])
const loading = ref(true)
const saving = ref(false)

const showAddClient = ref(false)
const selectedClientId = ref('')

const showClientModal = ref(false)
const selectedClient = ref(null)

const showPayModal = ref(false)
const payForm = ref({ method: 'efectivo', amount: 0 })
const payingClientId = ref(null)

let unsubClients, unsubOrders

onMounted(async () => {
  const snap = await getDoc(doc(db, `companies/${auth.companyId}/deliveryGroups`, groupId))
  if (snap.exists()) {
    group.value = { id: snap.id, ...snap.data() }
  } else {
    router.push('/delivery-groups')
    return
  }

  unsubClients = subscribeToCollection(auth.companyId, 'clients', (items) => {
    clients.value = items.sort((a, b) => a.name.localeCompare(b.name))
  })
  unsubOrders = subscribeToCollection(auth.companyId, 'orders', (items) => {
    orders.value = items
    loading.value = false
  })
})

onUnmounted(() => {
  unsubClients?.()
  unsubOrders?.()
})

const groupClients = computed(() => {
  const ids = group.value?.clientIds || []
  return clients.value.filter(c => ids.includes(c.id))
})

function getClientOrders(clientId) {
  return orders.value.filter(o => o.clientId === clientId)
}

function paidAmount(clientId) {
  return getClientOrders(clientId).reduce((s, o) => s + ((o.payments || []).reduce((sp, p) => sp + (p.amount || 0), 0)), 0)
}

function totalOwed(clientId) {
  return getClientOrders(clientId).reduce((s, o) => s + (o.total || 0), 0)
}

function clientStatus(clientId) {
  const paid = paidAmount(clientId)
  const total = totalOwed(clientId)
  if (total <= 0) return 'sin-pedidos'
  if (paid <= 0) return 'pendiente'
  if (paid >= total) return 'pagado'
  return 'parcial'
}

function statusLabel(status) {
  return {
    'sin-pedidos': 'Sin pedidos',
    pendiente: 'Pendiente',
    parcial: 'Parcial',
    pagado: 'Pagado',
  }[status]
}

function statusClass(status) {
  return {
    'sin-pedidos': 'bg-gray-100 text-gray-500',
    pendiente: 'bg-gray-100 text-gray-600',
    parcial: 'bg-amber-100 text-amber-700',
    pagado: 'bg-emerald-100 text-emerald-700',
  }[status]
}

function openMaps(url) {
  if (!url) return
  window.open(url, '_blank')
}

function openClient(client) {
  selectedClient.value = client
  showClientModal.value = true
}

function openPay(clientId) {
  const owed = totalOwed(clientId) - paidAmount(clientId)
  payingClientId.value = clientId
  payForm.value = { method: 'efectivo', amount: owed }
  showPayModal.value = true
}

async function savePayment() {
  if (!payForm.value.amount || payForm.value.amount <= 0 || !payingClientId.value) return
  saving.value = true
  try {
    const clientOrders = getClientOrders(payingClientId.value)
    const paymentRecord = {
      method: payForm.value.method,
      amount: Number(payForm.value.amount),
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    }

    let remaining = Number(payForm.value.amount)
    for (const order of clientOrders) {
      if (remaining <= 0) break
      const orderPaid = (order.payments || []).reduce((s, p) => s + (p.amount || 0), 0)
      const orderOwed = (order.total || 0) - orderPaid
      if (orderOwed <= 0) continue
      const toPay = Math.min(remaining, orderOwed)
      const ref = getDocRef(auth.companyId, 'orders', order.id)
      const currentPayments = order.payments || []
      await updateDoc(ref, { payments: [...currentPayments, { ...paymentRecord, amount: toPay }] })
      remaining -= toPay
    }

    await addDoc(getCollectionRef(auth.companyId, 'payments'), {
      clientId: payingClientId.value,
      amount: Number(payForm.value.amount),
      method: payForm.value.method,
      date: paymentRecord.date,
      notes: `Pago desde grupo de entrega ${group.value?.name || ''}`,
      createdAt: new Date().toISOString(),
    })

    showPayModal.value = false
    payingClientId.value = null
  } finally {
    saving.value = false
  }
}

async function addClient() {
  if (!selectedClientId.value) return
  const ids = [...(group.value?.clientIds || [])]
  if (ids.includes(selectedClientId.value)) return
  ids.push(selectedClientId.value)
  const ref = doc(db, `companies/${auth.companyId}/deliveryGroups`, groupId)
  await updateDoc(ref, { clientIds: ids })
  group.value.clientIds = ids
  selectedClientId.value = ''
  showAddClient.value = false
}

function getClientName(id) {
  return clients.value.find(c => c.id === id)?.name || 'Eliminado'
}

async function removeClient(clientId) {
  if (!confirm('¿Quitar este cliente del grupo?')) return
  const ids = (group.value?.clientIds || []).filter(id => id !== clientId)
  const ref = doc(db, `companies/${auth.companyId}/deliveryGroups`, groupId)
  await updateDoc(ref, { clientIds: ids })
  group.value.clientIds = ids
}
</script>

<template>
  <div>
    <div class="mb-6">
      <button @click="router.push('/delivery-groups')" class="mb-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        ← Volver a grupos
      </button>
      <div v-if="group" class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">{{ group.name }}</h1>
        <button
          @click="showAddClient = true"
          class="inline-flex items-center gap-2 self-start rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 active:scale-[0.97]"
        >
          ➕ Agregar cliente
        </button>
      </div>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-2xl bg-gray-200"></div>
    </div>

    <EmptyState
      v-else-if="!groupClients.length"
      icon="🚚"
      title="No hay clientes en este grupo"
      description="Agrega clientes a la ruta de entrega"
      actionText="Agregar cliente"
      @action="showAddClient = true"
    />

    <div v-else class="space-y-3">
      <div
        v-for="client in groupClients"
        :key="client.id"
        class="cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md"
        @click="openClient(client)"
      >
        <div class="flex items-start justify-between">
          <div class="min-w-0 flex-1">
            <h3 class="font-semibold text-gray-900">{{ client.name }}</h3>
            <p v-if="client.phone" class="mt-0.5 text-sm text-gray-500">{{ client.phone }}</p>
            <div class="mt-2 flex items-center gap-2">
              <span
                class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                :class="statusClass(clientStatus(client.id))"
              >
                {{ statusLabel(clientStatus(client.id)) }}
              </span>
              <span v-if="totalOwed(client.id) > 0" class="text-xs text-gray-500">
                Total: {{ formatCurrency(totalOwed(client.id)) }}
              </span>
            </div>
          </div>
          <button
            @click.stop="removeClient(client.id)"
            class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- Add client modal -->
    <Modal :open="showAddClient" title="Agregar cliente al grupo" @close="showAddClient = false">
      <div class="space-y-4">
        <SearchSelect
          v-model="selectedClientId"
          :options="clients.filter(c => !group?.clientIds?.includes(c.id)).map(c => ({ id: c.id, label: c.name }))"
          placeholder="Buscar cliente..."
          label="Cliente"
        />
        <div class="flex gap-3 pt-2">
          <button type="button" @click="showAddClient = false"
            class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button @click="addClient" :disabled="!selectedClientId"
            class="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            Agregar
          </button>
        </div>
      </div>
    </Modal>

    <!-- Client detail modal -->
    <Modal
      :open="showClientModal"
      :title="selectedClient?.name || ''"
      size="lg"
      @close="showClientModal = false"
    >
      <div v-if="selectedClient" class="space-y-4">
        <button
          v-if="selectedClient.mapsUrl"
          @click="openMaps(selectedClient.mapsUrl)"
          class="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Abrir en Google Maps
        </button>
        <p v-else class="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-400 text-center">
          Sin ubicación registrada
        </p>

        <button
          v-if="clientStatus(selectedClient.id) !== 'pagado' && clientStatus(selectedClient.id) !== 'sin-pedidos'"
          @click="openPay(selectedClient.id); showClientModal = false"
          class="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 active:scale-[0.97]"
        >
          Pagar
        </button>
      </div>
    </Modal>

    <!-- Pay modal -->
    <Modal :open="showPayModal" title="Registrar pago" size="sm" @close="showPayModal = false">
      <form @submit.prevent="savePayment" class="space-y-4">
        <div v-if="payingClientId">
          <p class="text-sm text-gray-500">{{ getClientName(payingClientId) }}</p>
          <p class="text-lg font-bold text-gray-900">Total: {{ formatCurrency(totalOwed(payingClientId)) }}</p>
          <p class="text-sm text-gray-500">
            Pagado: {{ formatCurrency(paidAmount(payingClientId)) }} |
            Pendiente: {{ formatCurrency(totalOwed(payingClientId) - paidAmount(payingClientId)) }}
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Método de pago</label>
          <select v-model="payForm.method"
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200">
            <option value="efectivo">Efectivo</option>
            <option value="sinpe">Sinpe Móvil</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Monto</label>
          <input v-model.number="payForm.amount" type="number" min="1" required
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <div class="flex gap-3 pt-2">
          <button type="button" @click="showPayModal = false"
            class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" :disabled="saving || !payForm.amount"
            class="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {{ saving ? 'Guardando...' : 'Pagar' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
