<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useMajorsStore } from '@/stores/majors.store'
import DepartmentCard from '@/components/DepartmentCard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const majorsStore = useMajorsStore()

const departments = computed(() =>
  majorsStore.majors.map((major: { id: string; name: string; acronym: string; image_url: string | null }) => ({
    id: major.id,
    name: major.acronym,
    img: major.image_url ?? '/src/assets/images/no-image.png',
    slug: major.acronym.toLowerCase(),
  })),
)

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
