<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  open: Boolean,
  title: String,
  size: { type: String, default: 'md' },
})

const emit = defineEmits(['close'])

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

watch(() => props.open, (val) => {
  if (val) document.body.style.overflow = 'hidden'
  else document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
        <div class="fixed inset-0 bg-black/40" @click="$emit('close')"></div>
        <div :class="[
          'relative z-10 w-full rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl sm:mx-4',
          sizes[size]
        ]">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">{{ title }}</h2>
            <button @click="$emit('close')" class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
.modal-enter-active > div:last-child {
  animation: slide-up 0.25s ease-out;
}
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
@media (min-width: 640px) {
  @keyframes slide-up {
    from { transform: translateY(10px) scale(0.98); opacity: 0; }
    to { transform: translateY(0) scale(1); opacity: 1; }
  }
}
</style>
