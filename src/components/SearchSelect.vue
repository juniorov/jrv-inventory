<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  options: { type: Array, default: () => [] },
  modelValue: { type: [String, null], default: null },
  placeholder: { type: String, default: 'Buscar...' },
  label: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const query = ref('')
const highlightIndex = ref(-1)
const inputRef = ref(null)

const selectedLabel = computed(() => {
  if (!props.modelValue) return ''
  const match = props.options.find(o => o.id === props.modelValue)
  return match ? match.label : ''
})

const filtered = computed(() => {
  if (!query.value) return props.options
  const q = query.value.toLowerCase()
  return props.options.filter(o => o.label.toLowerCase().includes(q))
})

watch(() => props.modelValue, () => {
  query.value = ''
})

function select(option) {
  emit('update:modelValue', option.id)
  query.value = ''
  open.value = false
  inputRef.value?.blur()
}

function clear() {
  emit('update:modelValue', null)
  query.value = ''
  inputRef.value?.focus()
}

function onInputFocus() {
  open.value = true
  highlightIndex.value = -1
}

function onInputBlur() {
  setTimeout(() => { open.value = false }, 200)
}

function onKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlightIndex.value = Math.min(highlightIndex.value + 1, filtered.value.length - 1)
    if (!open.value) open.value = true
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightIndex.value = Math.max(highlightIndex.value - 1, -1)
  } else if (e.key === 'Enter' && highlightIndex.value >= 0) {
    e.preventDefault()
    select(filtered.value[highlightIndex.value])
  } else if (e.key === 'Escape') {
    open.value = false
  }
}
</script>

<template>
  <div class="relative">
    <label v-if="label" class="mb-1 block text-sm font-medium text-gray-700">{{ label }}</label>

    <div class="relative">
      <input
        ref="inputRef"
        :value="open ? query : selectedLabel"
        @input="open = true; query = $event.target.value"
        @focus="onInputFocus"
        @blur="onInputBlur"
        @keydown="onKeydown"
        :placeholder="placeholder"
        class="block w-full rounded-xl border border-gray-300 px-4 py-3 pr-10 text-sm placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
      />

      <button
        v-if="props.modelValue && !open"
        @click="clear"
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <ul
      v-if="open"
      class="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
    >
      <li
        v-if="!filtered.length"
        class="px-4 py-3 text-sm text-gray-400"
      >Sin resultados</li>
      <li
        v-for="(option, i) in filtered"
        :key="option.id"
        @click="select(option)"
        @mouseenter="highlightIndex = i"
        :class="[
          'cursor-pointer px-4 py-3 text-sm transition-colors',
          i === highlightIndex ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'
        ]"
      >
        {{ option.label }}
      </li>
    </ul>
  </div>
</template>
