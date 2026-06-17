import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, collection, query, where, getDocs, addDoc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase/index'

function waitForAuthReady() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub()
      resolve(user)
    })
  })
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const companyId = ref(null)
  const company = ref(null)
  const loading = ref(true)
  const error = ref(null)

  const isAuthenticated = computed(() => !!user.value)
  const hasCompany = computed(() => !!companyId.value)

  async function init() {
    const firebaseUser = await waitForAuthReady()
    error.value = null

    if (firebaseUser) {
      user.value = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      }

      try {
        const memberSnap = await getDocs(
          query(collection(db, 'companyMembers'), where('userId', '==', firebaseUser.uid))
        )

        if (!memberSnap.empty) {
          const member = memberSnap.docs[0].data()
          companyId.value = member.companyId
          const companySnap = await getDoc(doc(db, 'companies', member.companyId))
          if (companySnap.exists()) {
            company.value = { id: companySnap.id, ...companySnap.data() }
          }
        }
      } catch (e) {
        error.value = e.message
      }
    }

    loading.value = false

    onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        user.value = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        }
      } else {
        user.value = null
        companyId.value = null
        company.value = null
      }
    })
  }

  async function loginWithGoogle() {
    await signInWithPopup(auth, googleProvider)
  }

  async function logout() {
    await signOut(auth)
    companyId.value = null
    company.value = null
    error.value = null
  }

  async function createCompany(name) {
    const companyRef = await addDoc(collection(db, 'companies'), {
      name,
      createdAt: new Date().toISOString(),
    })

    await setDoc(doc(db, 'companies', companyRef.id), { name, createdAt: new Date().toISOString() })

    await addDoc(collection(db, 'companyMembers'), {
      companyId: companyRef.id,
      userId: user.value.uid,
      email: user.value.email,
      displayName: user.value.displayName,
      role: 'admin',
      joinedAt: new Date().toISOString(),
    })

    await addDoc(collection(db, `companies/${companyRef.id}/members`), {
      name: user.value.displayName,
      email: user.value.email,
      status: 'active',
      role: 'admin',
      createdAt: new Date().toISOString(),
    })

    companyId.value = companyRef.id
    company.value = { id: companyRef.id, name }
    return companyRef.id
  }

  return {
    user,
    companyId,
    company,
    loading,
    error,
    isAuthenticated,
    hasCompany,
    init,
    loginWithGoogle,
    logout,
    createCompany,
  }
})
