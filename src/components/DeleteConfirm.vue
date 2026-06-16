<script setup>
import Modal from './Modal.vue'

defineProps({
  open: Boolean,
  title: { type: String, default: '¿Eliminar?' },
  message: { type: String, default: 'Esta acción no se puede deshacer.' },
  loading: Boolean,
})
const emit = defineEmits(['close', 'confirm'])
</script>

<template>
  <Modal :open="open" title="Confirmar" size="sm" @close="$emit('close')">
    <div class="space-y-4">
      <div class="text-center">
        <span class="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-100 text-2xl">⚠️</span>
        <h3 class="mt-3 text-lg font-semibold text-gray-900">{{ title }}</h3>
        <p class="mt-1 text-sm text-gray-500">{{ message }}</p>
      </div>
      <div class="flex gap-3">
        <button @click="$emit('close')" class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancelar
        </button>
        <button @click="$emit('confirm')" :disabled="loading" class="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
          {{ loading ? 'Eliminando...' : 'Eliminar' }}
        </button>
      </div>
    </div>
  </Modal>
</template>
