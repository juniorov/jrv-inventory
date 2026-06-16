import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase/index'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const companyId = ref(null)
  const company = ref(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => !!user.value)
  const hasCompany = computed(() => !!companyId.value)

  function init() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          user.value = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          }

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
        } else {
          user.value = null
          companyId.value = null
          company.value = null
        }
        loading.value = false
        resolve()
      })
    })
  }

  async function loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  }

  async function logout() {
    await signOut(auth)
    companyId.value = null
    company.value = null
  }

  async function createCompany(name) {
    const companyRef = await addDoc(collection(db, 'companies'), {
      name,
      createdAt: new Date().toISOString(),
    })

    const code = companyRef.id.slice(0, 8)
    await setDoc(doc(db, 'companies', companyRef.id), { name, invitationCode: code, createdAt: new Date().toISOString() })

    await addDoc(collection(db, 'companyMembers'), {
      companyId: companyRef.id,
      userId: user.value.uid,
      email: user.value.email,
      displayName: user.value.displayName,
      role: 'admin',
      joinedAt: new Date().toISOString(),
    })

    companyId.value = companyRef.id
    company.value = { id: companyRef.id, name, invitationCode: code }
    return companyRef.id
  }

  async function joinCompany(code) {
    const q = query(collection(db, 'companies'), where('invitationCode', '==', code))
    const snap = await getDocs(q)
    if (snap.empty) throw new Error('Código de invitación inválido')

    const companyDoc = snap.docs[0]
    const memberSnap = await getDocs(
      query(collection(db, 'companyMembers'), where('companyId', '==', companyDoc.id), where('userId', '==', user.value.uid))
    )

    if (memberSnap.empty) {
      await addDoc(collection(db, 'companyMembers'), {
        companyId: companyDoc.id,
        userId: user.value.uid,
        email: user.value.email,
        displayName: user.value.displayName,
        role: 'admin',
        joinedAt: new Date().toISOString(),
      })
    }

    companyId.value = companyDoc.id
    company.value = { id: companyDoc.id, ...companyDoc.data() }
  }

  return {
    user,
    companyId,
    company,
    loading,
    isAuthenticated,
    hasCompany,
    init,
    loginWithGoogle,
    logout,
    createCompany,
    joinCompany,
  }
})
