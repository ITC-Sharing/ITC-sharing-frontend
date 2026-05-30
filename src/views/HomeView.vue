<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useMajorsStore } from '@/stores/majors.store'
import DepartmentCard from '@/components/DepartmentCard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const majorsStore = useMajorsStore()

const DEP_IMG = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/department`

const imageMap: Record<string, string> = {
  GIC: `${DEP_IMG}/gic.jpg`,
  AMS: `${DEP_IMG}/ams.jpg`,
  GIM: `${DEP_IMG}/gim.jpg`,
  GTR: `${DEP_IMG}/gtr.jpg`,
  GCA: `${DEP_IMG}/gca.png`,
  GAR: `${DEP_IMG}/gar.jpg`,
  GRU: `${DEP_IMG}/gru.png`,
  GTI: `${DEP_IMG}/gti.png`,
  GEE: `${DEP_IMG}/gee.jpeg`,
}

const departments = computed(() =>
  majorsStore.majors.map((major: any) => ({
    id: major.id,
    name: major.acronym,
    img: imageMap[major.acronym] ?? `${DEP_IMG}/itc.png`,
    slug: major.acronym.toLowerCase(),
  })),
)

onMounted(() => {
  if (majorsStore.majors.length === 0) {
    majorsStore.fetchMajors()
  }
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
