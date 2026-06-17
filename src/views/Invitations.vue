<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { subscribeToCollection } from '../utils/helpers'
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/index'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'

const auth = useAuthStore()
const members = ref([])
const invitations = ref([])
const loading = ref(true)
const generatedLinks = ref({})

let unsubMembers, unsubInvitations

onMounted(() => {
  unsubMembers = subscribeToCollection(auth.companyId, 'members', (items) => {
    members.value = items
    loading.value = false
  })
  const invRef = collection(db, 'invitations')
  const invQ = query(invRef, where('companyId', '==', auth.companyId), where('status', '==', 'pending'))
  unsubInvitations = onSnapshot(invQ, (snapshot) => {
    invitations.value = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
  })
})

onUnmounted(() => {
  unsubMembers?.()
  unsubInvitations?.()
})

const pendingMembers = computed(() =>
  members.value.filter(m => m.status === 'pending')
)

function existingLink(memberId) {
  const inv = invitations.value.find(i => i.memberId === memberId)
  if (!inv) return null
  return `${location.origin}/invite/${inv.id}`
}

async function generateLink(member) {
  const token = crypto.randomUUID().slice(0, 12)
  generatedLinks.value[member.id] = 'generando...'

  try {
    await setDoc(doc(db, 'invitations', token), {
      companyId: auth.companyId,
      memberId: member.id,
      email: member.email,
      name: member.name,
      status: 'pending',
      createdAt: new Date().toISOString(),
    })

    const link = `${location.origin}/invite/${token}`
    generatedLinks.value[member.id] = link
    await navigator.clipboard.writeText(link)
  } catch {
    generatedLinks.value[member.id] = 'error'
  }
}

function copyLink(link) {
  if (link) navigator.clipboard.writeText(link)
}

function linkToShow(memberId) {
  return generatedLinks.value[memberId] || existingLink(memberId)
}
</script>

<template>
  <div>
    <PageHeader
      title="Invitaciones"
      description="Genera links para invitar socios"
    />

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 2" :key="i" class="h-20 animate-pulse rounded-2xl bg-gray-200"></div>
    </div>

    <EmptyState
      v-else-if="!pendingMembers.length"
      icon="🔗"
      title="No hay socios pendientes"
      description="Agrega socios en la sección Socios para invitarlos"
    />

    <div v-else class="space-y-3">
      <div
        v-for="member in pendingMembers"
        :key="member.id"
        class="rounded-2xl border bg-white p-4 shadow-sm"
      >
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="font-semibold text-gray-900">{{ member.name }}</h3>
            <p class="text-sm text-gray-500">{{ member.email }}</p>
          </div>
          <button
            v-if="!linkToShow(member.id)"
            @click="generateLink(member)"
            class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 active:scale-[0.97]"
          >
            Generar link
          </button>
        </div>

        <div v-if="linkToShow(member.id)">
          <div v-if="generatedLinks[member.id] === 'generando...'" class="text-sm text-gray-400">
            Generando...
          </div>
          <div v-else-if="generatedLinks[member.id] === 'error'" class="text-sm text-red-500">
            Error al generar. Intenta de nuevo.
          </div>
          <div v-else class="flex items-center gap-2">
            <input
              :value="linkToShow(member.id)"
              readonly
              class="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600"
            />
            <button
              @click="copyLink(linkToShow(member.id))"
              class="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200"
            >
              Copiar
            </button>
            <button
              @click="generateLink(member)"
              class="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
            >
              Regenerar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
