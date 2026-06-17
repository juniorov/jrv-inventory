<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  subscribeToCollection, createDocument, deleteDocument,
} from '../utils/helpers'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import DeleteConfirm from '../components/DeleteConfirm.vue'

const auth = useAuthStore()
const router = useRouter()
const groups = ref([])
const clients = ref([])
const loading = ref(true)

const showDelete = ref(false)
const deletingId = ref(null)

let unsubGroups, unsubClients

onMounted(() => {
  unsubGroups = subscribeToCollection(auth.companyId, 'deliveryGroups', (items) => {
    groups.value = items
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

const groupsWithClientCount = computed(() =>
  groups.value.map(g => ({
    ...g,
    clientCount: g.clientIds?.length || 0,
  }))
)

function getClientName(id) {
  return clients.value.find(c => c.id === id)?.name || 'Eliminado'
}

async function createGroup() {
  const name = prompt('Nombre del grupo de entrega:')
  if (!name?.trim()) return
  await createDocument(auth.companyId, 'deliveryGroups', {
    name: name.trim(),
    clientIds: [],
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
      v-else-if="!groups.length"
      icon="🚚"
      title="No hay grupos de entrega"
      description="Crea un grupo para organizar las entregas"
      actionText="Crear grupo"
      @action="createGroup"
    />

    <div v-else class="space-y-3">
      <div
        v-for="group in groupsWithClientCount"
        :key="group.id"
        class="cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md"
        @click="router.push(`/delivery-groups/${group.id}`)"
      >
        <div class="flex items-start justify-between">
          <div class="min-w-0 flex-1">
            <h3 class="font-semibold text-gray-900">{{ group.name }}</h3>
            <p class="mt-1 text-sm text-gray-500">{{ group.clientCount }} clientes</p>
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
    </div>

    <DeleteConfirm
      :open="showDelete"
      title="¿Eliminar grupo?"
      message="Este grupo de entrega será eliminado."
      @close="showDelete = false"
      @confirm="remove"
    />
  </div>
</template>
