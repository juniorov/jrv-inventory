<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { subscribeToCollection, createDocument, deleteDocument } from '../utils/helpers'
import { writeBatch, doc } from 'firebase/firestore'
import { db } from '../firebase/index'
import PageHeader from '../components/PageHeader.vue'
import Modal from '../components/Modal.vue'
import SearchSelect from '../components/SearchSelect.vue'
import EmptyState from '../components/EmptyState.vue'
import DeleteConfirm from '../components/DeleteConfirm.vue'
import { VueDraggable } from 'vue-draggable-plus'

const auth = useAuthStore()
const router = useRouter()
const clients = ref([])
const orderLists = ref([])
const loading = ref(true)
const showDelete = ref(false)
const deletingId = ref(null)

const showCreate = ref(false)
const saving = ref(false)
const createForm = ref({ name: '', orderListId: null })

// sortedGroups is the full list in display order; visibleGroups (derived) is what
// vue-draggable-plus mutates directly, so it must be a plain ref, not a computed
const sortedGroups = ref([])
const visibleGroups = ref([])

function rebuildVisibleGroups() {
  visibleGroups.value = sortedGroups.value.filter(g => {
    if (!g.orderListId) return true
    const list = orderLists.value.find(l => l.id === g.orderListId)
    return !list?.archived
  })
}

watch([sortedGroups, orderLists], rebuildVisibleGroups, { deep: true })

const activeOrderListOptions = computed(() =>
  orderLists.value
    .filter(l => !l.archived)
    .map(l => ({ id: l.id, label: l.date || 'Sin fecha' }))
)

let unsubGroups, unsubClients, unsubOrderLists

onMounted(() => {
  unsubGroups = subscribeToCollection(auth.companyId, 'deliveryGroups', (items) => {
    sortedGroups.value = [...items].sort((a, b) => {
      if (a.order != null && b.order != null) return a.order - b.order
      if (a.order != null) return -1
      if (b.order != null) return 1
      return 0
    })
    loading.value = false
  })
  unsubClients = subscribeToCollection(auth.companyId, 'clients', (items) => {
    clients.value = items.sort((a, b) => a.name.localeCompare(b.name))
  })
  unsubOrderLists = subscribeToCollection(auth.companyId, 'orderLists', (items) => {
    orderLists.value = items
  })
})

onUnmounted(() => {
  unsubGroups?.()
  unsubClients?.()
  unsubOrderLists?.()
})

function getClientName(id) {
  return clients.value.find(c => c.id === id)?.name || 'Eliminado'
}

function getOrderListLabel(id) {
  const list = orderLists.value.find(l => l.id === id)
  return list?.date || null
}

function openCreate() {
  createForm.value = { name: '', orderListId: null }
  showCreate.value = true
}

async function createGroup() {
  if (!createForm.value.name.trim()) return
  saving.value = true
  try {
    await createDocument(auth.companyId, 'deliveryGroups', {
      name: createForm.value.name.trim(),
      clientIds: [],
      order: sortedGroups.value.length,
      orderListId: createForm.value.orderListId || null,
    })
    showCreate.value = false
  } finally {
    saving.value = false
  }
}

function confirmDelete(id) {
  deletingId.value = id
  showDelete.value = true
}

async function remove() {
  await deleteDocument(auth.companyId, 'deliveryGroups', deletingId.value)
  showDelete.value = false
  deletingId.value = null
}

async function saveOrder() {
  const batch = writeBatch(db)
  visibleGroups.value.forEach((group, index) => {
    const ref = doc(db, `companies/${auth.companyId}/deliveryGroups`, group.id)
    batch.update(ref, { order: index })
  })
  await batch.commit()
}
</script>

<template>
  <div>
    <PageHeader
      title="Grupos de Entrega"
      description="Agrupa clientes para rutas de entrega"
      :showButton="true"
      buttonText="Crear grupo"
      buttonIcon="➕"
      @action="openCreate"
    />

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-2xl bg-gray-200"></div>
    </div>

    <EmptyState
      v-else-if="!visibleGroups.length"
      icon="🚚"
      title="No hay grupos de entrega"
      description="Crea un grupo para organizar las entregas"
      actionText="Crear grupo"
      @action="openCreate"
    />

    <VueDraggable
      v-else
      v-model="visibleGroups"
      handle=".drag-handle"
      :animation="150"
      class="space-y-3"
      @end="saveOrder"
    >
      <div
        v-for="group in visibleGroups"
        :key="group.id"
        class="rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md"
      >
        <div class="flex items-start justify-between">
          <div class="flex min-w-0 flex-1 items-start gap-2">
            <span
              class="drag-handle mt-0.5 cursor-grab touch-none select-none text-gray-300 active:cursor-grabbing"
              title="Arrastrar para reordenar"
            >⠿</span>
            <div
              class="min-w-0 flex-1 cursor-pointer"
              @click="router.push(`/delivery-groups/${group.id}`)"
            >
              <div class="flex items-center gap-2">
                <h3 class="font-semibold text-gray-900">{{ group.name }}</h3>
                <span
                  v-if="getOrderListLabel(group.orderListId)"
                  class="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                >
                  📋 {{ getOrderListLabel(group.orderListId) }}
                </span>
              </div>
              <p class="mt-1 text-sm text-gray-500">{{ group.clientIds?.length || 0 }} clientes</p>
            </div>
          </div>
          <button
            @click.stop="confirmDelete(group.id)"
            class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            🗑️
          </button>
        </div>
        <div v-if="group.clientIds?.length" class="mt-3 flex flex-wrap gap-1.5">
          <span
            v-for="cid in group.clientIds"
            :key="cid"
            class="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
          >
            {{ getClientName(cid) }}
          </span>
        </div>
      </div>
    </VueDraggable>

    <Modal :open="showCreate" title="Crear grupo de entrega" @close="showCreate = false">
      <form @submit.prevent="createGroup" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Nombre *</label>
          <input v-model="createForm.name" type="text" required autofocus
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <SearchSelect
          v-model="createForm.orderListId"
          :options="activeOrderListOptions"
          placeholder="Buscar lista de pedidos..."
          label="Lista de pedidos (opcional)"
        />
        <div class="flex gap-3 pt-2">
          <button type="button" @click="showCreate = false"
            class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" :disabled="saving || !createForm.name.trim()"
            class="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {{ saving ? 'Guardando...' : 'Crear' }}
          </button>
        </div>
      </form>
    </Modal>

    <DeleteConfirm
      :open="showDelete"
      title="¿Eliminar grupo?"
      message="Este grupo de entrega será eliminado."
      @close="showDelete = false"
      @confirm="remove"
    />
  </div>
</template>
