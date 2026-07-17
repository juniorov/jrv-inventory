<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { subscribeToCollection, createDocument, deleteDocument } from '../utils/helpers'
import { writeBatch, doc } from 'firebase/firestore'
import { db } from '../firebase/index'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import DeleteConfirm from '../components/DeleteConfirm.vue'
import { VueDraggable } from 'vue-draggable-plus'

const auth = useAuthStore()
const router = useRouter()
const clients = ref([])
const loading = ref(true)
const showDelete = ref(false)
const deletingId = ref(null)

// sortedGroups is the source of truth for display order; vue-draggable-plus mutates it directly
const sortedGroups = ref([])

let unsubGroups, unsubClients

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
})

onUnmounted(() => {
  unsubGroups?.()
  unsubClients?.()
})

function getClientName(id) {
  return clients.value.find(c => c.id === id)?.name || 'Eliminado'
}

async function createGroup() {
  const name = prompt('Nombre del grupo de entrega:')
  if (!name?.trim()) return
  await createDocument(auth.companyId, 'deliveryGroups', {
    name: name.trim(),
    clientIds: [],
    order: sortedGroups.value.length,
  })
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
  sortedGroups.value.forEach((group, index) => {
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
      @action="createGroup"
    />

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-2xl bg-gray-200"></div>
    </div>

    <EmptyState
      v-else-if="!sortedGroups.length"
      icon="🚚"
      title="No hay grupos de entrega"
      description="Crea un grupo para organizar las entregas"
      actionText="Crear grupo"
      @action="createGroup"
    />

    <VueDraggable
      v-else
      v-model="sortedGroups"
      handle=".drag-handle"
      :animation="150"
      class="space-y-3"
      @end="saveOrder"
    >
      <div
        v-for="group in sortedGroups"
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
              <h3 class="font-semibold text-gray-900">{{ group.name }}</h3>
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

    <DeleteConfirm
      :open="showDelete"
      title="¿Eliminar grupo?"
      message="Este grupo de entrega será eliminado."
      @close="showDelete = false"
      @confirm="remove"
    />
  </div>
</template>
