<script setup>
defineProps({
  icon: { type: String, default: '📭' },
  title: String,
  description: String,
  actionText: String,
})
defineEmits(['action'])
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center">
    <span class="mb-4 text-5xl">{{ icon }}</span>
    <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-gray-500">{{ description }}</p>
    <button
      v-if="actionText"
      @click="$emit('action')"
      class="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.97]"
    >
      {{ actionText }}
    </button>
  </div>
</template>
