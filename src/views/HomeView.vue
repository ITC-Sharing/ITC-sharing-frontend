<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useMajorsStore } from '@/stores/majors.store'
import { useAuthStore } from '@/stores/auth.store'
import DepartmentCard from '@/components/departments/DepartmentCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import noImage from '@/assets/images/no-image.png'

const majorsStore = useMajorsStore()
const auth = useAuthStore()

const departments = computed(() => {
  const cards = majorsStore.majors.map((major) => ({
    id: major.id,
    name: major.acronym,
    img: major.image_url ?? noImage,
    slug: major.acronym.toLowerCase(),
  }))

  // The signed-in user's own department leads; everything else keeps the
  // server's ordering (name ASC). Array.sort is stable, so this only lifts the
  // one card. Anonymous visitors see the unmodified list.
  const mine = auth.user?.major_id
  if (!mine) return cards

  return cards.sort((a, b) => Number(b.id === mine) - Number(a.id === mine))
})

onMounted(() => {
  if (majorsStore.majors.length === 0) majorsStore.fetchMajors()
})
</script>

<template>
  <div class="flex items-center justify-center">
    <!-- Loading -->
    <div v-if="majorsStore.loading" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <!-- Loaded -->
    <div v-else class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <DepartmentCard
        v-for="dep in departments"
        :key="dep.id"
        :depName="dep.name"
        :depImg="dep.img"
        :depSlug="dep.slug"
      />
    </div>
  </div>
</template>
