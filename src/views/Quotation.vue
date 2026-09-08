<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { subscribeToCollection, formatCurrency } from '../utils/helpers'
import PageHeader from '../components/PageHeader.vue'
import SearchSelect from '../components/SearchSelect.vue'

const auth = useAuthStore()
const products = ref([])
const orders = ref([])
const batches = ref([])
const loading = ref(true)

let unsubProducts, unsubOrders, unsubBatches

onMounted(() => {
  unsubProducts = subscribeToCollection(auth.companyId, 'products', (items) => {
    products.value = items
    loading.value = false
  })
  unsubOrders = subscribeToCollection(auth.companyId, 'orders', (items) => {
    orders.value = items
  })
  unsubBatches = subscribeToCollection(auth.companyId, 'batches', (items) => {
    batches.value = items
  })
})

onUnmounted(() => {
  unsubProducts?.()
  unsubOrders?.()
  unsubBatches?.()
})

const productOptions = computed(() => products.value.map(p => ({ id: p.id, label: p.name })))

const totalBatchCost = computed(() => batches.value.reduce((sum, b) => sum + (b.totalCost || 0), 0))
const totalUnitsSold = computed(() => orders.value.reduce((sum, o) => sum + (o.quantity || 0), 0))

const avgCostPerUnit = computed(() => {
  if (!totalUnitsSold.value) return null
  return totalBatchCost.value / totalUnitsSold.value
})

const selectedProductId = ref(null)
const costoUnitario = ref(0)
const precioReal = ref(0)
const cantidad = ref(1)
const precioMayorista = ref(0)

const selectedProduct = computed(() => products.value.find(p => p.id === selectedProductId.value) || null)

function onSelectProduct(productId) {
  selectedProductId.value = productId
  const product = products.value.find(p => p.id === productId)
  costoUnitario.value = avgCostPerUnit.value ? Number(avgCostPerUnit.value.toFixed(2)) : 0
  precioReal.value = product?.price || 0
}

const showResult = computed(() => selectedProductId.value && cantidad.value > 0 && precioMayorista.value > 0)

const totalAPagar = computed(() => precioMayorista.value * cantidad.value)
const costoTotal = computed(() => costoUnitario.value * cantidad.value)
const gananciaUnitariaReal = computed(() => precioReal.value - costoUnitario.value)
const margenReal = computed(() => precioReal.value > 0 ? (gananciaUnitariaReal.value / precioReal.value) * 100 : 0)
const gananciaTotalReal = computed(() => gananciaUnitariaReal.value * cantidad.value)
const gananciaUnitariaMayorista = computed(() => precioMayorista.value - costoUnitario.value)
const margenMayorista = computed(() => precioMayorista.value > 0 ? (gananciaUnitariaMayorista.value / precioMayorista.value) * 100 : 0)
const gananciaTotalMayorista = computed(() => gananciaUnitariaMayorista.value * cantidad.value)
const diferenciaUnitaria = computed(() => precioReal.value - precioMayorista.value)
const diferenciaTotal = computed(() => diferenciaUnitaria.value * cantidad.value)
const vendiendoBajoCosto = computed(() => precioMayorista.value < costoUnitario.value)
</script>

<template>
  <div>
    <PageHeader
      title="Cotización"
      description="Calcula cuánto ganas o pierdes al vender al por mayor"
    />

    <div v-if="loading" class="space-y-3">
      <div class="h-40 animate-pulse rounded-2xl bg-gray-200"></div>
    </div>

    <div v-else class="space-y-4">
      <div class="rounded-2xl border bg-white p-4 shadow-sm">
        <div v-if="avgCostPerUnit !== null" class="mb-4 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">
          Costo promedio de producción calculado: <span class="font-semibold text-gray-700">{{ formatCurrency(avgCostPerUnit) }}</span>
          por unidad (basado en {{ totalUnitsSold }} unidades vendidas)
        </div>
        <div v-else class="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Sin datos suficientes para calcular un costo promedio (no hay lotes u órdenes registradas). Puedes digitarlo manualmente.
        </div>

        <div class="space-y-4">
          <SearchSelect
            :options="productOptions"
            :model-value="selectedProductId"
            @update:model-value="onSelectProduct"
            label="Producto"
            placeholder="Buscar producto..."
          />

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700">Costo unitario de producción</label>
              <div class="relative mt-1">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">₡</span>
                <input v-model.number="costoUnitario" type="number" step="0.01" min="0"
                  class="block w-full rounded-xl border border-gray-300 px-4 py-3 pl-8 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Precio de venta real</label>
              <div class="relative mt-1">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">₡</span>
                <input v-model.number="precioReal" type="number" step="0.01" min="0"
                  class="block w-full rounded-xl border border-gray-300 px-4 py-3 pl-8 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700">Cantidad al por mayor</label>
              <input v-model.number="cantidad" type="number" step="1" min="1"
                class="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Precio unitario al por mayor</label>
              <div class="relative mt-1">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">₡</span>
                <input v-model.number="precioMayorista" type="number" step="0.01" min="0" placeholder="0.00"
                  class="block w-full rounded-xl border border-gray-300 px-4 py-3 pl-8 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showResult" class="rounded-2xl border bg-white p-4 shadow-sm">
        <h3 class="mb-3 font-semibold text-gray-900">{{ selectedProduct?.name }} — Resultado</h3>

        <div v-if="vendiendoBajoCosto" class="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          ⚠️ Estarías vendiendo por debajo del costo de producción.
        </div>

        <div class="mb-4 rounded-xl bg-emerald-50 px-4 py-3">
          <p class="text-xs font-medium text-emerald-700">Total a pagar por el cliente ({{ cantidad }} unidades)</p>
          <p class="text-2xl font-bold text-emerald-700">{{ formatCurrency(totalAPagar) }}</p>
        </div>

        <div class="space-y-1 text-sm">
          <div class="flex items-center justify-between text-gray-600">
            <span>Costo unitario de producción</span>
            <span class="font-medium">{{ formatCurrency(costoUnitario) }}</span>
          </div>
          <div class="flex items-center justify-between text-gray-600">
            <span>Costo total ({{ cantidad }} unidades)</span>
            <span class="font-medium text-red-600">{{ formatCurrency(costoTotal) }}</span>
          </div>
        </div>

        <div class="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
          <div class="flex items-center justify-between text-gray-600">
            <span>Ganancia unitaria a precio real</span>
            <span class="font-medium" :class="gananciaUnitariaReal >= 0 ? 'text-emerald-600' : 'text-red-600'">
              {{ formatCurrency(gananciaUnitariaReal) }} ({{ margenReal.toFixed(1) }}%)
            </span>
          </div>
          <div class="flex items-center justify-between font-semibold">
            <span>Ganancia total a precio real ({{ cantidad }} unidades)</span>
            <span :class="gananciaTotalReal >= 0 ? 'text-emerald-600' : 'text-red-600'">
              {{ formatCurrency(gananciaTotalReal) }}
            </span>
          </div>
          <div class="flex items-center justify-between text-gray-600">
            <span>Ganancia unitaria al precio mayorista</span>
            <span class="font-medium" :class="gananciaUnitariaMayorista >= 0 ? 'text-emerald-600' : 'text-red-600'">
              {{ formatCurrency(gananciaUnitariaMayorista) }} ({{ margenMayorista.toFixed(1) }}%)
            </span>
          </div>
          <div class="flex items-center justify-between font-semibold">
            <span>Ganancia total al precio mayorista</span>
            <span :class="gananciaTotalMayorista >= 0 ? 'text-emerald-600' : 'text-red-600'">
              {{ formatCurrency(gananciaTotalMayorista) }}
            </span>
          </div>
        </div>

        <div class="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
          <div class="flex items-center justify-between text-gray-600">
            <span>Lo que dejas de ganar por unidad</span>
            <span class="font-medium text-amber-600">{{ formatCurrency(diferenciaUnitaria) }}</span>
          </div>
          <div class="flex items-center justify-between font-semibold">
            <span>Total que dejas de ganar en el pedido</span>
            <span class="text-amber-600">{{ formatCurrency(diferenciaTotal) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
