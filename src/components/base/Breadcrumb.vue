<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

export interface BreadcrumbItem {
  label: string
  to?: RouteLocationRaw
}

defineProps<{ items: BreadcrumbItem[] }>()
</script>

<template>
  <!-- Hidden on phones, where the back arrow in the navbar is how people
       actually go up a level and the trail only costs a row of the screen.
       `hidden md:flex`, not `md:block`: the separators rely on the flex row. -->
  <nav aria-label="Breadcrumb" class="hidden items-center gap-1.5 text-sm text-gray-400 md:flex">
    <template v-for="(item, index) in items" :key="index">
      <RouterLink v-if="item.to" :to="item.to" class="hover:text-gray-600 transition-colors">{{
        item.label
      }}</RouterLink>
      <span v-else class="text-gray-700 font-medium">{{ item.label }}</span>
      <span v-if="index < items.length - 1" class="text-gray-300 select-none">/</span>
    </template>
  </nav>
</template>
