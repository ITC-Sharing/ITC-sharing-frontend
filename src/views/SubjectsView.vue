<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useSubjectsStore } from '@/stores/subjects.store'
import { useMajorsStore } from '@/stores/majors.store'
import SubjectCard from '@/components/SubjectCard.vue'
import SearchButton from '@/components/SearchButton.vue'
import FilterButton from '@/components/FilterButton.vue'
import AddnewSubject from '@/components/AddnewSubject.vue'

const route = useRoute()
const subjectsStore = useSubjectsStore()
const majorsStore = useMajorsStore()

type Major = {
  id: string
  acronym: string
  name: string
}

type Subject = {
  id: string
  name: string
  image?: string | null
}

const slug = route.params.slug as string
const yearLevel = Number(route.params.year)
const searchQuery = ref('')
const selectedSubject = ref('')

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
  (majorsStore.majors as Major[]).find((major) => major.acronym === slugToAcronym[slug]),
)

const subjectOptions = computed(() =>
  (subjectsStore.subjects as Subject[]).map((subject) => ({
    label: subject.name,
    value: subject.name,
  })),
)

const filteredSubjects = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return (subjectsStore.subjects as Subject[]).filter((subject) => {
    const matchesSearch = !query || subject.name?.toLowerCase().includes(query)
    const matchesFilter = !selectedSubject.value || subject.name === selectedSubject.value

    return matchesSearch && matchesFilter
  })
})

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
  <div class="mx-auto w-full max-w-7xl px-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-black">
        {{ currentMajor?.acronym }} — Year {{ yearLevel }}
      </h1>
      <div class="flex gap-3">
        <SearchButton v-model="searchQuery" placeholder="ស្វែងរកមុខវិជ្ជា" />
        <FilterButton
          v-model="selectedSubject"
          :options="subjectOptions"
          placeholder="មុខវិជ្ជា"
          class="w-full md:w-72"
        />
      </div>
    </div>

    <div class="mb-3 flex flex-col gap-3 md:flex-row md:items-center"></div>

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
    <div v-else-if="filteredSubjects.length === 0" class="text-center py-20 text-gray-400">
      No subjects match your search.
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-4 gap-2">
      <AddnewSubject />
      <SubjectCard
        v-for="subject in filteredSubjects"
        :key="subject.id"
        :title="subject.name"
        :img="subject.image || '/src/assets/images/no-image.png'"
      />
    </div>
  </div>
</template>
