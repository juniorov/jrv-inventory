<script setup>
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div v-if="auth.loading" class="flex h-dvh items-center justify-center bg-emerald-600">
    <div class="text-center">
      <div class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
      <p class="text-lg font-medium text-white">Cargando...</p>
    </div>
  </div>
  <router-view v-else />
</template>
