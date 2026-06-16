import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/index'

export function getCompanyRef(companyId) {
  return doc(db, 'companies', companyId)
}

export function getCollectionPath(companyId, name) {
  return `companies/${companyId}/${name}`
}

export function getCollectionRef(companyId, name) {
  return collection(db, `companies/${companyId}/${name}`)
}

export function getDocRef(companyId, collectionName, docId) {
  return doc(db, `companies/${companyId}/${collectionName}`, docId)
}

export function createCompanyRef() {
  return collection(db, 'companies')
}

export function createDocument(companyId, collectionName, data) {
  const ref = getCollectionRef(companyId, collectionName)
  return addDoc(ref, { ...data, createdAt: serverTimestamp() })
}

export function updateDocument(companyId, collectionName, docId, data) {
  const ref = getDocRef(companyId, collectionName, docId)
  return updateDoc(ref, data)
}

export function deleteDocument(companyId, collectionName, docId) {
  const ref = getDocRef(companyId, collectionName, docId)
  return deleteDoc(ref)
}

export function subscribeToCollection(companyId, collectionName, callback, orderByField = 'createdAt', direction = 'desc') {
  const ref = getCollectionRef(companyId, collectionName)
  const q = query(ref, orderBy(orderByField, direction))
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    callback(items)
  })
}

export function timestampToDate(ts) {
  if (!ts) return ''
  const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts)
  return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0)
}
