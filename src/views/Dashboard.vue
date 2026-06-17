<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { subscribeToCollection, formatCurrency } from '../utils/helpers'

const auth = useAuthStore()

const stats = ref({ clients: 0, products: 0, orders: 0, pendingPayments: 0, totalIncome: 0, totalExpenses: 0 })

let unsubClients, unsubProducts, unsubOrders, unsubPayments, unsubBatches

onMounted(() => {
  unsubClients = subscribeToCollection(auth.companyId, 'clients', (items) => { stats.value.clients = items.length })
  unsubProducts = subscribeToCollection(auth.companyId, 'products', (items) => { stats.value.products = items.length })

  unsubOrders = subscribeToCollection(auth.companyId, 'orders', (items) => {
    stats.value.orders = items.length
    stats.value.totalIncome = items.reduce((s, o) => s + (o.total || 0), 0)
  }, 'createdAt', 'desc')

  unsubPayments = subscribeToCollection(auth.companyId, 'payments', (items) => {
    stats.value.pendingPayments = items.length
  })

  unsubBatches = subscribeToCollection(auth.companyId, 'batches', (items) => {
    stats.value.totalExpenses = items.reduce((s, b) => s + (b.totalCost || 0), 0)
  })
})

onUnmounted(() => {
  unsubClients?.()
  unsubProducts?.()
  unsubOrders?.()
  unsubPayments?.()
  unsubBatches?.()
})
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p class="mt-1 text-sm text-gray-500">Resumen general de {{ auth.company?.name }}</p>
    </div>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
      <div class="rounded-2xl border bg-white p-4 shadow-sm">
        <p class="text-xs font-medium uppercase tracking-wider text-gray-500">Clientes</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">{{ stats.clients }}</p>
      </div>
      <div class="rounded-2xl border bg-white p-4 shadow-sm">
        <p class="text-xs font-medium uppercase tracking-wider text-gray-500">Productos</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">{{ stats.products }}</p>
      </div>
      <div class="rounded-2xl border bg-white p-4 shadow-sm">
        <p class="text-xs font-medium uppercase tracking-wider text-gray-500">Pedidos</p>
        <p class="mt-1 text-2xl font-bold text-gray-900">{{ stats.orders }}</p>
      </div>
      <div class="rounded-2xl border bg-white p-4 shadow-sm">
        <p class="text-xs font-medium uppercase tracking-wider text-gray-500">Ingresos</p>
        <p class="mt-1 text-2xl font-bold text-emerald-600">{{ formatCurrency(stats.totalIncome) }}</p>
      </div>
      <div class="rounded-2xl border bg-white p-4 shadow-sm">
        <p class="text-xs font-medium uppercase tracking-wider text-gray-500">Gastos</p>
        <p class="mt-1 text-2xl font-bold text-red-600">{{ formatCurrency(stats.totalExpenses) }}</p>
      </div>
      <div class="rounded-2xl border bg-white p-4 shadow-sm">
        <p class="text-xs font-medium uppercase tracking-wider text-gray-500">Balance</p>
        <p :class="['mt-1 text-2xl font-bold', stats.totalIncome - stats.totalExpenses >= 0 ? 'text-emerald-600' : 'text-red-600']">
          {{ formatCurrency(stats.totalIncome - stats.totalExpenses) }}
        </p>
      </div>
    </div>
  </div>
</template>
