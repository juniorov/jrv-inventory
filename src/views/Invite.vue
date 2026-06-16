<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/index'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const token = route.params.token
const state = ref('verifying')
const error = ref('')

onMounted(async () => {
  const invitationSnap = await getDoc(doc(db, 'invitations', token))

  if (!invitationSnap.exists() || invitationSnap.data().status !== 'pending') {
    state.value = 'error'
    error.value = 'Este link de invitación no es válido o ya fue usado.'
    return
  }

  const invitation = invitationSnap.data()

  if (!auth.currentUser) {
    state.value = 'login'
    return
  }

  await acceptInvitation(invitation)
})

async function acceptInvitation(invitation) {
  if (auth.currentUser.email !== invitation.email) {
    state.value = 'error'
    error.value = `Esta invitación es para ${invitation.email}. Inicia sesión con esa cuenta.`
    return
  }

  state.value = 'accepting'

  const memberSnap = await getDocs(
    query(collection(db, 'companyMembers'), where('userId', '==', auth.currentUser.uid))
  )

  if (!memberSnap.empty) {
    state.value = 'error'
    error.value = 'Ya perteneces a una empresa.'
    return
  }

  await addDoc(collection(db, 'companyMembers'), {
    companyId: invitation.companyId,
    userId: auth.currentUser.uid,
    email: auth.currentUser.email,
    displayName: auth.currentUser.displayName,
    role: 'member',
    joinedAt: new Date().toISOString(),
  })

  if (invitation.memberId) {
    const memberRef = doc(db, `companies/${invitation.companyId}/members`, invitation.memberId)
    await updateDoc(memberRef, { status: 'active' })
  }

  await updateDoc(doc(db, 'invitations', token), { status: 'accepted' })

  state.value = 'done'
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-800 px-4">
    <div class="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
      <div v-if="state === 'verifying'" class="py-8">
        <div class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
        <p class="text-gray-600">Verificando invitación...</p>
      </div>

      <div v-else-if="state === 'login'" class="py-4">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
          <span class="text-3xl font-bold text-emerald-600">🔗</span>
        </div>
        <h1 class="mb-2 text-xl font-bold text-gray-900">Invitación recibida</h1>
        <p class="mb-6 text-sm text-gray-500">Inicia sesión con Google para aceptar la invitación</p>
        <button
          @click="authStore.loginWithGoogle()"
          class="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Iniciar sesión con Google
        </button>
      </div>

      <div v-else-if="state === 'accepting'" class="py-8">
        <div class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
        <p class="text-gray-600">Aceptando invitación...</p>
      </div>

      <div v-else-if="state === 'done'" class="py-4">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
          <span class="text-3xl">✅</span>
        </div>
        <h1 class="mb-2 text-xl font-bold text-gray-900">¡Invitación aceptada!</h1>
        <p class="mb-6 text-sm text-gray-500">Ya eres miembro de la empresa.</p>
        <button
          @click="router.push('/')"
          class="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
        >
          Ir al dashboard
        </button>
      </div>

      <div v-else class="py-4">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
          <span class="text-3xl">❌</span>
        </div>
        <h1 class="mb-2 text-xl font-bold text-gray-900">Error</h1>
        <p class="mb-6 text-sm text-gray-500">{{ error }}</p>
        <button
          @click="router.push('/')"
          class="w-full rounded-xl bg-gray-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-gray-700"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  </div>
</template>
