<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  subscribeToCollection, createDocument, updateDocument, deleteDocument, getDocRef,
  formatCurrency, getCollectionRef
} from '../utils/helpers'
import { doc, getDoc, deleteDoc } from 'firebase/firestore'
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
const showDelete = ref(false)
const deletingId = ref(null)
const saving = ref(false)
const loading = ref(true)

const form = ref({ clientId: '', productId: '', quantity: 1 })

const selectedProduct = computed(() => products.value.find(p => p.id === form.value.productId))
const totalPrice = computed(() => {
  if (selectedProduct.value && form.value.quantity) {
    return selectedProduct.value.price * form.value.quantity
  }
  return 0
})

const grandTotal = computed(() => orders.value.reduce((s, o) => s + (o.total || 0), 0))

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
  form.value = { clientId: '', productId: '', quantity: 1 }
}

function openCreate() {
  resetForm()
  showModal.value = true
}

async function save() {
  if (!form.value.clientId || !form.value.productId || !form.value.quantity) return
  saving.value = true
  try {
    await createDocument(auth.companyId, 'orders', {
      orderListId: listId,
      clientId: form.value.clientId,
      productId: form.value.productId,
      quantity: Number(form.value.quantity),
      unitPrice: selectedProduct.value.price,
      total: selectedProduct.value.price * Number(form.value.quantity),
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
      <div
        v-for="order in orders"
        :key="order.id"
        class="rounded-2xl border bg-white p-4 shadow-sm"
      >
        <div class="flex items-start justify-between">
          <div class="min-w-0 flex-1">
            <h3 class="font-semibold text-gray-900">{{ getClientName(order.clientId) }}</h3>
            <p class="mt-1 text-sm text-gray-500">{{ getProductName(order.productId) }} × {{ order.quantity }}</p>
            <p class="mt-1 text-sm font-medium text-emerald-600">Total: {{ formatCurrency(order.total) }}</p>
          </div>
          <button @click="confirmDelete(order.id)" class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 ml-3">
            🗑️
          </button>
        </div>
      </div>

      <div class="rounded-2xl border bg-emerald-50 p-4">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-gray-900">Total general</span>
          <span class="text-xl font-bold text-emerald-700">{{ formatCurrency(grandTotal) }}</span>
        </div>
      </div>
    </div>

    <Modal :open="showModal" title="Agregar pedido" size="lg" @close="showModal = false">
      <form @submit.prevent="save" class="space-y-4">
        <div>
          <SearchSelect
            v-model="form.clientId"
            :options="clients.map(c => ({ id: c.id, label: c.name }))"
            placeholder="Buscar cliente..."
            label="Cliente *"
          />
        </div>
        <div>
          <SearchSelect
            v-model="form.productId"
            :options="products.map(p => ({ id: p.id, label: `${p.name} - ${formatCurrency(p.price)}` }))"
            placeholder="Buscar producto..."
            label="Producto *"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Cantidad *</label>
          <input v-model.number="form.quantity" type="number" min="1" required
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <div v-if="selectedProduct" class="rounded-xl bg-gray-50 p-3 text-sm">
          <p>Precio unitario: <strong>{{ formatCurrency(selectedProduct.price) }}</strong></p>
          <p>Total: <strong>{{ formatCurrency(totalPrice) }}</strong></p>
        </div>
        <div class="flex gap-3 pt-2">
          <button type="button" @click="showModal = false"
            class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" :disabled="saving || !form.clientId || !form.productId"
            class="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {{ saving ? 'Guardando...' : 'Agregar' }}
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
