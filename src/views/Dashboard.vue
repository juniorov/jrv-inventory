<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { subscribeToCollection, formatCurrency } from '../utils/helpers'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

function fmtNoDec(amount) {
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(amount || 0)
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const auth = useAuthStore()

const clients = ref(0)
const products = ref(0)
const orders = ref([])
const batches = ref([])
const orderLists = ref([])

const batchOrderListIds = computed(() =>
  new Set(batches.value.filter(b => b.orderListId).map(b => b.orderListId))
)

const producedOrders = computed(() =>
  orders.value.filter(o => batchOrderListIds.value.has(o.orderListId))
)

const stats = computed(() => {
  const totalIncome = producedOrders.value.reduce((s, o) => s + (o.total || 0), 0)
  const totalExpenses = batches.value.reduce((s, b) => s + (b.totalCost || 0), 0)
  const pendingPayments = orders.value.filter(o => {
    const paid = (o.payments || []).reduce((s, p) => s + (p.amount || 0), 0)
    return paid < (o.total || 0)
  }).length
  return {
    clients: clients.value,
    products: products.value,
    orders: orders.value.length,
    pendingPayments,
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
  }
})

const monthlyProfit = computed(() => {
  const map = {}

  batches.value.forEach(b => {
    let month = b.date?.slice(0, 7)
    if (!month) return

    const listOrders = producedOrders.value.filter(o => o.orderListId === b.orderListId)
    const income = listOrders.reduce((s, o) => s + (o.total || 0), 0)
    const cost = b.totalCost || 0

    if (!map[month]) map[month] = { income: 0, cost: 0, profit: 0 }
    map[month].income += income
    map[month].cost += cost
    map[month].profit += income - cost
  })

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      label: new Date(month + '-01').toLocaleDateString('es', { month: 'short', year: '2-digit' }),
      ...data,
    }))
})

const chartData = computed(() => ({
  labels: monthlyProfit.value.map(m => m.label),
  datasets: [
    {
      label: 'Ganancia',
      data: monthlyProfit.value.map(m => m.profit),
      backgroundColor: monthlyProfit.value.map(m => m.profit >= 0 ? 'rgba(5, 150, 105, 0.7)' : 'rgba(220, 38, 38, 0.7)'),
      borderColor: monthlyProfit.value.map(m => m.profit >= 0 ? '#059669' : '#dc2626'),
      borderWidth: 1,
      borderRadius: 4,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const val = ctx.raw
          const prefix = val >= 0 ? '₡' : '-₡'
          return `Ganancia: ${prefix}${Math.abs(val).toLocaleString('es-CR')}`
        },
      },
    },
  },
  scales: {
    y: {
      ticks: {
        callback: (v) => `₡${v >= 0 ? v : ''}`,
      },
    },
  },
}

let unsubClients, unsubProducts, unsubOrders, unsubBatches, unsubOrderLists

onMounted(() => {
  unsubClients = subscribeToCollection(auth.companyId, 'clients', (items) => { clients.value = items.length })
  unsubProducts = subscribeToCollection(auth.companyId, 'products', (items) => { products.value = items.length })
  unsubOrders = subscribeToCollection(auth.companyId, 'orders', (items) => { orders.value = items })
  unsubBatches = subscribeToCollection(auth.companyId, 'batches', (items) => { batches.value = items })
  unsubOrderLists = subscribeToCollection(auth.companyId, 'orderLists', (items) => { orderLists.value = items })
})

onUnmounted(() => {
  unsubClients?.()
  unsubProducts?.()
  unsubOrders?.()
  unsubBatches?.()
  unsubOrderLists?.()
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
        <p class="mt-1 text-2xl font-bold text-emerald-600">{{ fmtNoDec(stats.totalIncome) }}</p>
      </div>
      <div class="rounded-2xl border bg-white p-4 shadow-sm">
        <p class="text-xs font-medium uppercase tracking-wider text-gray-500">Gastos</p>
        <p class="mt-1 text-2xl font-bold text-red-600">{{ fmtNoDec(stats.totalExpenses) }}</p>
      </div>
      <div class="rounded-2xl border bg-white p-4 shadow-sm">
        <p class="text-xs font-medium uppercase tracking-wider text-gray-500">Balance</p>
        <p :class="['mt-1 text-2xl font-bold', stats.balance >= 0 ? 'text-emerald-600' : 'text-red-600']">
          {{ fmtNoDec(stats.balance) }}
        </p>
      </div>
    </div>

    <div v-if="monthlyProfit.length" class="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
      <h2 class="mb-4 text-sm font-semibold text-gray-700">Ganancia por mes</h2>
      <div class="h-64">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
      <div class="mt-4 space-y-1 text-sm">
        <div v-for="m in monthlyProfit" :key="m.month" class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5">
          <span class="text-gray-600">{{ m.label }}</span>
          <div class="flex gap-4 text-xs">
            <span class="text-emerald-600">+{{ formatCurrency(m.income) }}</span>
            <span class="text-red-600">-{{ formatCurrency(m.cost) }}</span>
            <span :class="['font-medium', m.profit >= 0 ? 'text-emerald-700' : 'text-red-700']">
              {{ formatCurrency(m.profit) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
