import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from '../firebase/index'

export function waitForAuthReady() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback)
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(auth, provider)
  return result.user
}

export async function logout() {
  await signOut(auth)
}
