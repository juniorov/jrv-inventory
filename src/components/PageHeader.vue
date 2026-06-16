<script setup>
defineProps({
  title: String,
  description: String,
  showButton: Boolean,
  buttonText: String,
  buttonIcon: String,
})

defineEmits(['action'])
</script>

<template>
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">{{ title }}</h1>
      <p v-if="description" class="mt-1 text-sm text-gray-500">{{ description }}</p>
    </div>
    <button
      v-if="showButton"
      @click="$emit('action')"
      class="inline-flex items-center gap-2 self-start rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.97]"
    >
      <span>{{ buttonIcon }}</span>
      {{ buttonText }}
    </button>
  </div>
</template>
