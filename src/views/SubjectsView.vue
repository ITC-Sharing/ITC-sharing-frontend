<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSubjectsStore } from '@/stores/subjects.store'
import { useMajorsStore } from '@/stores/majors.store'
import SubjectCard from '@/components/SubjectCard.vue'

const route = useRoute()
const { t } = useI18n({ useScope: 'global' })
const subjectsStore = useSubjectsStore()
const majorsStore = useMajorsStore()

const slug = route.params.slug as string
const yearLevel = Number(route.params.year)

// Map slug → acronym → major from store
const slugToAcronym: Record<string, string> = {
  gic: 'GIC',
  ams: 'AMS',
  gim: 'GIM',
  gtr: 'GTR',
  gca: 'GCA',
  gar: 'GAR',
  gru: 'GRU',
  gti: 'GTI',
  gee: 'GEE',
  foundation: 'FOUND',
}

const currentMajor = computed(() =>
  majorsStore.majors.find((m: any) => m.acronym === slugToAcronym[slug]),
)

onMounted(async () => {
  // Fetch majors first if not already loaded (e.g. direct page visit)
  if (!majorsStore.majors.length) {
    await majorsStore.fetchMajors()
  }

  if (currentMajor.value) {
    subjectsStore.fetchByMajorAndYear(currentMajor.value.id, yearLevel)
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-6">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-black">
        {{ currentMajor?.acronym }} — Year {{ yearLevel }}
      </h1>
      <p class="text-sm text-gray-500 mt-1">{{ currentMajor?.name }}</p>
    </div>

    <!-- Loading -->
    <div v-if="subjectsStore.loading" class="flex justify-center py-20">
      <svg
        class="animate-spin h-8 w-8 text-[#0057BD]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    </div>

    <!-- Error -->
    <div v-else-if="subjectsStore.error" class="text-center py-20 text-red-500">
      {{ subjectsStore.error }}
    </div>

    <!-- Empty -->
    <div v-else-if="subjectsStore.subjects.length === 0" class="text-center py-20 text-gray-400">
      No subjects found for this year.
    </div>

    <!-- Subject list -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <SubjectCard
        v-for="subject in subjectsStore.subjects"
        :key="subject.id"
        :title="subject.name"
        :img="subject.image || '/src/assets/images/no-image.png'"
      />
    </div>

  </div>
</template>
