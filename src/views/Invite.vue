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
const invitation = ref(null)
const loggingIn = ref(false)

onMounted(async () => {
  try {
    const snap = await getDoc(doc(db, 'invitations', token))

    if (!snap.exists()) {
      state.value = 'error'
      error.value = 'Este link de invitación no es válido.'
      return
    }

    const inv = snap.data()

    if (inv.status === 'accepted') {
      state.value = 'error'
      error.value = 'Esta invitación ya fue utilizada.'
      return
    }

    if (inv.expiresAt?.toDate?.() < new Date()) {
      state.value = 'error'
      error.value = 'Esta invitación ha expirado.'
      return
    }

    invitation.value = inv

    if (!authStore.isAuthenticated) {
      sessionStorage.setItem('pendingInvite', token)
      state.value = 'login'
      return
    }

    if (authStore.user.email !== inv.email) {
      state.value = 'error'
      error.value = `Esta invitación es para ${inv.email}. Inicia sesión con esa cuenta.`
      return
    }

    state.value = 'ready'
  } catch {
    state.value = 'error'
    error.value = 'No se pudo verificar la invitación. Intenta de nuevo.'
  }
})

async function handleLoginFromInvite() {
  loggingIn.value = true
  try {
    await authStore.loginWithGoogle()
    window.location.reload()
  } finally {
    loggingIn.value = false
  }
}

async function handleAccept() {
  if (!invitation.value || !authStore.user) return
  state.value = 'accepting'

  try {
    await addDoc(collection(db, 'companyMembers'), {
      companyId: invitation.value.companyId,
      userId: authStore.user.uid,
      email: authStore.user.email,
      displayName: authStore.user.displayName,
      role: 'member',
      joinedAt: new Date().toISOString(),
    })

    if (invitation.value.memberId) {
      const memberRef = doc(db, `companies/${invitation.value.companyId}/members`, invitation.value.memberId)
      await updateDoc(memberRef, { status: 'active' })
    }

    await updateDoc(doc(db, 'invitations', token), { status: 'accepted', acceptedAt: new Date().toISOString() })

    await authStore.reloadCompany()

    state.value = 'done'
  } catch {
    state.value = 'error'
    error.value = 'Ocurrió un error al aceptar la invitación. Intenta de nuevo.'
  }
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-800 px-4">
    <div class="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
      <!-- Verifying -->
      <div v-if="state === 'verifying'" class="py-8">
        <div class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
        <p class="text-gray-600">Verificando invitación...</p>
      </div>

      <!-- Login required -->
      <div v-else-if="state === 'login'" class="py-4">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
          <span class="text-3xl font-bold text-emerald-600">🔗</span>
        </div>
        <h1 class="mb-1 text-xl font-bold text-gray-900">Invitación</h1>
        <p v-if="invitation" class="mb-4 text-sm text-gray-500">
          Fuiste invitado a <strong>{{ invitation.name || 'una empresa' }}</strong>
        </p>
        <p class="mb-6 text-sm text-gray-500">Inicia sesión con Google para aceptar la invitación</p>
        <button
          @click="handleLoginFromInvite"
          :disabled="loggingIn"
          class="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
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

      <!-- Ready to accept -->
      <div v-else-if="state === 'ready'" class="py-4">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
          <span class="text-3xl font-bold text-emerald-600">🔗</span>
        </div>
        <h1 class="mb-1 text-xl font-bold text-gray-900">Invitación</h1>
        <p v-if="invitation" class="mb-4 text-sm text-gray-500">
          Fuiste invitado a <strong>{{ invitation.name || 'la empresa' }}</strong>
        </p>
        <p class="mb-2 text-sm text-gray-500">
          Has iniciado sesión como <strong>{{ authStore.user?.email }}</strong>
        </p>
        <button
          @click="handleAccept"
          class="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 active:scale-[0.97]"
        >
          Aceptar invitación
        </button>
      </div>

      <!-- Accepting -->
      <div v-else-if="state === 'accepting'" class="py-8">
        <div class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
        <p class="text-gray-600">Aceptando invitación...</p>
      </div>

      <!-- Done -->
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

      <!-- Error -->
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
