<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  subscribeToCollection, createDocument, updateDocument, deleteDocument, getDocRef,
  formatCurrency, getCollectionRef
} from '../utils/helpers'
import { doc, getDoc, updateDoc, addDoc } from 'firebase/firestore'
import { db } from '../firebase/index'
import Modal from '../components/Modal.vue'
import EmptyState from '../components/EmptyState.vue'
import DeleteConfirm from '../components/DeleteConfirm.vue'
import SearchSelect from '../components/SearchSelect.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const listId = route.params.id

const orderList = ref(null)
const orders = ref([])
const clients = ref([])
const products = ref([])
const showModal = ref(false)
const showPayModal = ref(false)
const showDelete = ref(false)
const payingOrder = ref(null)
const editingOrder = ref(null)
const deletingId = ref(null)
const saving = ref(false)
const loading = ref(true)

const form = ref({ clientId: '', productId: '', quantity: 1, unitPrice: 0 })
const payForm = ref({ method: 'efectivo', amount: 0 })
const searchQuery = ref('')

const selectedProduct = computed(() => products.value.find(p => p.id === form.value.productId))
const totalPrice = computed(() => {
  if (form.value.unitPrice && form.value.quantity) {
    return form.value.unitPrice * form.value.quantity
  }
  return 0
})

const grandTotal = computed(() => orders.value.reduce((s, o) => s + (o.total || 0), 0))
const grandPaid = computed(() => orders.value.reduce((s, o) => s + paidAmount(o), 0))

function paidAmount(order) {
  return (order.payments || []).reduce((s, p) => s + (p.amount || 0), 0)
}

function orderStatus(order) {
  const paid = paidAmount(order)
  if (paid <= 0) return 'pendiente'
  if (paid >= order.total) return 'pagado'
  return 'parcial'
}

function statusLabel(status) {
  return { pendiente: 'Pendiente', parcial: 'Parcial', pagado: 'Pagado' }[status]
}

function statusClass(status) {
  return {
    pendiente: 'bg-gray-100 text-gray-600',
    parcial: 'bg-amber-100 text-amber-700',
    pagado: 'bg-emerald-100 text-emerald-700',
  }[status]
}

const filteredOrders = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  let result = orders.value
  if (q) {
    result = result.filter(o => {
      const name = getClientName(o.clientId).toLowerCase()
      return name.includes(q)
    })
  }
  return [...result].sort((a, b) => {
    const aPaid = orderStatus(a) === 'pagado' ? 1 : 0
    const bPaid = orderStatus(b) === 'pagado' ? 1 : 0
    if (aPaid !== bPaid) return aPaid - bPaid
    const aName = getClientName(a.clientId).toLowerCase()
    const bName = getClientName(b.clientId).toLowerCase()
    return aName.localeCompare(bName)
  })
})

let unsubOrders, unsubClients, unsubProducts

onMounted(async () => {
  const snap = await getDoc(doc(db, `companies/${auth.companyId}/orderLists`, listId))
  if (snap.exists()) orderList.value = { id: snap.id, ...snap.data() }

  unsubClients = subscribeToCollection(auth.companyId, 'clients', (items) => {
    clients.value = items.sort((a, b) => a.name.localeCompare(b.name))
  })
  unsubProducts = subscribeToCollection(auth.companyId, 'products', (items) => {
    products.value = items.sort((a, b) => a.name.localeCompare(b.name))
  })
  unsubOrders = subscribeToCollection(auth.companyId, 'orders', (items) => {
    orders.value = items.filter(o => o.orderListId === listId)
    loading.value = false
  })
})

onUnmounted(() => {
  unsubOrders?.()
  unsubClients?.()
  unsubProducts?.()
})

function resetForm() {
  form.value = { clientId: '', productId: '', quantity: 1, unitPrice: 0 }
  editingOrder.value = null
}

function openCreate() {
  resetForm()
  showModal.value = true
}

function openEdit(order) {
  editingOrder.value = order
  form.value = {
    clientId: order.clientId,
    productId: order.productId,
    quantity: order.quantity,
    unitPrice: order.unitPrice,
  }
  showModal.value = true
}

async function save() {
  if (!form.value.clientId || !form.value.productId || !form.value.quantity || !form.value.unitPrice) return
  saving.value = true
  try {
    const data = {
      clientId: form.value.clientId,
      productId: form.value.productId,
      quantity: Number(form.value.quantity),
      unitPrice: Number(form.value.unitPrice),
      total: Number(form.value.unitPrice) * Number(form.value.quantity),
    }
    if (editingOrder.value) {
      await updateDocument(auth.companyId, 'orders', editingOrder.value.id, data)
    } else {
      await createDocument(auth.companyId, 'orders', {
        ...data,
        orderListId: listId,
        payments: [],
      })
    }
    showModal.value = false
    resetForm()
  } finally {
    saving.value = false
  }
}

function openPay(order) {
  const owed = order.total - paidAmount(order)
  payingOrder.value = order
  payForm.value = { method: 'sinpe', amount: owed }
  showPayModal.value = true
}

async function savePayment() {
  if (!payForm.value.amount || payForm.value.amount <= 0 || !payingOrder.value) return
  saving.value = true
  try {
    const paymentRecord = {
      method: payForm.value.method,
      amount: Number(payForm.value.amount),
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    }

    const currentPayments = payingOrder.value.payments || []
    const ref = getDocRef(auth.companyId, 'orders', payingOrder.value.id)
    await updateDoc(ref, { payments: [...currentPayments, paymentRecord] })

    await addDoc(getCollectionRef(auth.companyId, 'payments'), {
      clientId: payingOrder.value.clientId,
      orderId: payingOrder.value.id,
      amount: Number(payForm.value.amount),
      method: payForm.value.method,
      date: paymentRecord.date,
      notes: `Pago desde pedido en lista ${orderList.value?.date || ''}`,
      createdAt: new Date().toISOString(),
    })

    showPayModal.value = false
    payingOrder.value = null
  } finally {
    saving.value = false
  }
}

function confirmDelete(id) {
  deletingId.value = id
  showDelete.value = true
}

function autoFillPrice() {
  if (!form.value.unitPrice && selectedProduct.value) {
    form.value.unitPrice = selectedProduct.value.price
  }
}

async function remove() {
  await deleteDocument(auth.companyId, 'orders', deletingId.value)
  showDelete.value = false
  deletingId.value = null
}

function getClientName(id) {
  return clients.value.find(c => c.id === id)?.name || 'Eliminado'
}

function getProductName(id) {
  return products.value.find(p => p.id === id)?.name || 'Eliminado'
}
</script>

<template>
  <div>
    <div class="mb-6">
      <button @click="router.push('/order-lists')" class="mb-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        ← Volver a listas
      </button>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            Pedidos {{ orderList?.date || '' }}
          </h1>
          <p v-if="orderList?.notes" class="mt-1 text-sm text-gray-500">{{ orderList.notes }}</p>
        </div>
        <button
          @click="openCreate"
          class="inline-flex items-center gap-2 self-start rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 active:scale-[0.97]"
        >
          ➕ Agregar pedido
        </button>
      </div>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-2xl bg-gray-200"></div>
    </div>

    <EmptyState
      v-else-if="!orders.length"
      icon="📝"
      title="No hay pedidos en esta lista"
      description="Agrega pedidos con cliente y producto"
      actionText="Agregar pedido"
      @action="openCreate"
    />

    <div v-else class="space-y-3">
      <div class="relative">
        <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por cliente..."
          class="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      <p v-if="!filteredOrders.length" class="text-center text-sm text-gray-400 py-8">
        No se encontraron pedidos para "{{ searchQuery }}"
      </p>

      <template v-else>
        <div
          v-for="order in filteredOrders"
          :key="order.id"
          class="rounded-2xl border bg-white p-4 shadow-sm"
        >
          <div class="flex items-start justify-between">
            <div class="min-w-0 flex-1">
              <h3 class="font-semibold text-gray-900">{{ getClientName(order.clientId) }}</h3>
              <p class="mt-1 text-sm text-gray-500">{{ getProductName(order.productId) }} × {{ order.quantity }}</p>
              <p class="mt-1 text-sm font-medium text-emerald-600">Total: {{ formatCurrency(order.total) }}</p>
              <div class="mt-2 flex items-center gap-2">
                <span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusClass(orderStatus(order))">
                  {{ statusLabel(orderStatus(order)) }}
                </span>
                <span v-if="paidAmount(order) > 0" class="text-xs text-gray-500">
                  Pagado: {{ formatCurrency(paidAmount(order)) }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button
                v-if="orderStatus(order) !== 'pagado'"
                @click="openPay(order)"
                class="rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50"
              >
                Pagar
              </button>
              <button @click="openEdit(order)" class="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                ✏️
              </button>
              <button @click="confirmDelete(order.id)" class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </template>

      <div class="rounded-2xl border bg-emerald-50 p-4">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-gray-900">Total general</span>
          <span class="text-xl font-bold text-emerald-700">{{ formatCurrency(grandTotal) }}</span>
        </div>
        <div v-if="grandPaid > 0" class="mt-1 flex items-center justify-between text-sm text-emerald-600">
          <span>Pagado</span>
          <span class="font-medium">{{ formatCurrency(grandPaid) }}</span>
        </div>
        <div class="mt-1 flex items-center justify-between text-sm text-gray-500">
          <span>Pendiente</span>
          <span class="font-medium">{{ formatCurrency(grandTotal - grandPaid) }}</span>
        </div>
      </div>
    </div>

    <Modal :open="showModal" :title="editingOrder ? 'Editar pedido' : 'Agregar pedido'" size="lg" @close="showModal = false">
      <form @submit.prevent="save" class="space-y-4">
        <div>
          <SearchSelect
            v-model="form.clientId"
            :options="clients.map(c => ({ id: c.id, label: c.name }))"
            placeholder="Buscar cliente..."
            label="Cliente *"
            :disabled="!!editingOrder"
          />
        </div>
        <div>
          <SearchSelect
            v-model="form.productId"
            :options="products.map(p => ({ id: p.id, label: `${p.name} - ${formatCurrency(p.price)}` }))"
            placeholder="Buscar producto..."
            label="Producto *"
            :disabled="!!editingOrder"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Cantidad *</label>
          <input v-model.number="form.quantity" type="number" min="1" required
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Precio unitario *</label>
          <div class="relative mt-1">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
            <input v-model.number="form.unitPrice" type="number" step="0.01" min="0" required placeholder="0.00"
              @focus="autoFillPrice"
              class="block w-full rounded-xl border border-gray-300 px-4 py-3 pl-8 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          </div>
          <p v-if="selectedProduct" class="mt-1 text-xs text-gray-400">
            Precio base: {{ formatCurrency(selectedProduct.price) }}
          </p>
        </div>
        <div v-if="totalPrice" class="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          Total: {{ formatCurrency(totalPrice) }}
        </div>
        <div class="flex gap-3 pt-2">
          <button type="button" @click="showModal = false"
            class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" :disabled="saving || !form.clientId || !form.productId || !form.unitPrice"
            class="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {{ saving ? 'Guardando...' : editingOrder ? 'Guardar cambios' : 'Agregar' }}
          </button>
        </div>
      </form>
    </Modal>

    <Modal :open="showPayModal" title="Registrar pago" size="sm" @close="showPayModal = false">
      <form @submit.prevent="savePayment" class="space-y-4">
        <div v-if="payingOrder">
          <p class="text-sm text-gray-500">{{ getClientName(payingOrder.clientId) }}</p>
          <p class="text-lg font-bold text-gray-900">Total: {{ formatCurrency(payingOrder.total) }}</p>
          <p v-if="paidAmount(payingOrder) > 0" class="text-sm text-gray-500">
            Pagado: {{ formatCurrency(paidAmount(payingOrder)) }} |
            Pendiente: {{ formatCurrency(payingOrder.total - paidAmount(payingOrder)) }}
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Método de pago</label>
          <select v-model="payForm.method"
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200">
            <option value="sinpe">Sinpe Móvil</option>
            <option value="efectivo">Efectivo</option>
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

    <DeleteConfirm
      :open="showDelete"
      title="¿Eliminar pedido?"
      message="Este pedido será eliminado de la lista."
      @close="showDelete = false"
      @confirm="remove"
    />
  </div>
</template>
