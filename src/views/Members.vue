<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { subscribeToCollection, createDocument, deleteDocument } from '../utils/helpers'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/index'
import PageHeader from '../components/PageHeader.vue'
import Modal from '../components/Modal.vue'
import EmptyState from '../components/EmptyState.vue'
import DeleteConfirm from '../components/DeleteConfirm.vue'

const auth = useAuthStore()
const members = ref([])
const showModal = ref(false)
const showDelete = ref(false)
const deletingId = ref(null)
const saving = ref(false)
const loading = ref(true)
const form = ref({ name: '', email: '' })
const showLinkModal = ref(false)
const lastLink = ref('')

let unsubscribe

onMounted(() => {
  unsubscribe = subscribeToCollection(auth.companyId, 'members', (items) => {
    members.value = items
    loading.value = false
  })
})

onUnmounted(() => unsubscribe?.())

function resetForm() {
  form.value = { name: '', email: '' }
}

function openCreate() {
  resetForm()
  showModal.value = true
}

async function save() {
  if (!form.value.name.trim() || !form.value.email.trim()) return
  saving.value = true
  try {
    const memberRef = await createDocument(auth.companyId, 'members', {
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    })

    const token = crypto.randomUUID().slice(0, 12)
    await setDoc(doc(db, 'invitations', token), {
      companyId: auth.companyId,
      memberId: memberRef.id,
      email: form.value.email.trim(),
      name: form.value.name.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    })

    lastLink.value = `${location.origin}/invite/${token}`
    showModal.value = false
    resetForm()
    showLinkModal.value = true
  } finally {
    saving.value = false
  }
}

function copyLink() {
  navigator.clipboard.writeText(lastLink.value)
}

function confirmDelete(id) {
  deletingId.value = id
  showDelete.value = true
}

async function remove() {
  await deleteDocument(auth.companyId, 'members', deletingId.value)
  showDelete.value = false
  deletingId.value = null
}
</script>

<template>
  <div>
    <PageHeader
      title="Socios"
      description="Personas registradas en la empresa"
      :showButton="true"
      buttonText="Agregar socio"
      buttonIcon="➕"
      @action="openCreate"
    />

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-2xl bg-gray-200"></div>
    </div>

    <EmptyState
      v-else-if="!members.length"
      icon="🤝"
      title="No hay socios registrados"
      description="Agrega socios para luego invitarlos a la empresa"
      actionText="Agregar socio"
      @action="openCreate"
    />

    <div v-else class="space-y-3">
      <div
        v-for="member in members"
        :key="member.id"
        class="flex items-center justify-between rounded-2xl border bg-white p-4 shadow-sm"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-gray-900">{{ member.name }}</h3>
            <span
              :class="[
                'rounded-full px-2.5 py-0.5 text-xs font-medium',
                member.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              ]"
            >
              {{ member.status === 'active' ? 'Activo' : 'Pendiente' }}
            </span>
          </div>
          <p class="mt-0.5 text-sm text-gray-500">{{ member.email }}</p>
        </div>
        <button @click="confirmDelete(member.id)" class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 ml-3">
          🗑️
        </button>
      </div>
    </div>

    <Modal :open="showModal" title="Agregar socio" @close="showModal = false">
      <form @submit.prevent="save" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Nombre *</label>
          <input v-model="form.name" type="text" required placeholder="Nombre completo"
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Email *</label>
          <input v-model="form.email" type="email" required placeholder="correo@ejemplo.com"
            class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
        <div class="flex gap-3 pt-2">
          <button type="button" @click="showModal = false"
            class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="submit" :disabled="saving || !form.name.trim() || !form.email.trim()"
            class="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {{ saving ? 'Guardando...' : 'Agregar' }}
          </button>
        </div>
      </form>
    </Modal>

    <Modal :open="showLinkModal" title="Invitación generada" size="sm" @close="showLinkModal = false">
      <div class="space-y-4">
        <p class="text-sm text-gray-600">Compartí este link con el socio para que se una a la empresa:</p>
        <div class="flex items-center gap-2">
          <input :value="lastLink" readonly
            class="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600" />
          <button @click="copyLink"
            class="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-200">
            Copiar
          </button>
        </div>
        <button @click="showLinkModal = false"
          class="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
          Cerrar
        </button>
      </div>
    </Modal>

    <DeleteConfirm
      :open="showDelete"
      title="¿Eliminar socio?"
      message="Este socio será eliminado de la empresa."
      @close="showDelete = false"
      @confirm="remove"
    />
  </div>
</template>
