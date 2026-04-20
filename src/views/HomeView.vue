<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useMajorsStore } from '@/stores/majors.store'
import DepartmentCard from '@/components/DepartmentCard.vue'

const majorsStore = useMajorsStore()

// Local images mapped by acronym — server only gives us name + acronym
const imageMap: Record<string, string> = {
  GIC: '/src/assets/images/department/gic.jpg',
  AMS: '/src/assets/images/department/ams.jpg',
  GIM: '/src/assets/images/department/gim.jpg',
  GTR: '/src/assets/images/department/gtr.jpg',
  GCA: '/src/assets/images/department/gca.png',
  GAR: '/src/assets/images/department/gar.jpg',
  GRU: '/src/assets/images/department/gru.png',
  GTI: '/src/assets/images/department/gti.png',
  GEE: '/src/assets/images/department/gee.jpeg',
}

const departments = computed(() =>
  majorsStore.majors.map((major: any) => ({
    id: major.id,
    name: major.acronym,
    img: imageMap[major.acronym] ?? '/src/assets/images/department/itc.png',
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
    <div v-if="majorsStore.loading" class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div v-for="n in 8" :key="n" class="h-40 w-48 rounded-xl bg-gray-100 animate-pulse" />
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
