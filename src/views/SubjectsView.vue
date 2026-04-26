<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSubjectsStore } from '@/stores/subjects.store'
import { useMajorsStore } from '@/stores/majors.store'
import SubjectCard from '@/components/SubjectCard.vue'
import SearchButton from '@/components/SearchButton.vue'
import FilterButton from '@/components/FilterButton.vue'
import AddnewSubject from '@/components/AddnewSubject.vue'
import SubjectCreateModal from '@/components/SubjectCreateModal.vue'

const route = useRoute()
const { t } = useI18n({ useScope: 'global' })
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
  semester?: number | null
  subject_url?: string | null
  image?: string | null
}

type SortValue = '' | 'name' | 'semester1' | 'semester2'

const slug = route.params.slug as string
const yearLevel = Number(route.params.year)
const searchQuery = ref('')
const selectedSort = ref<SortValue>('')
const showAddSubjectModal = ref(false)

function openCreateModal() {
  subjectsStore.createError = null
  showAddSubjectModal.value = true
}

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
  foundation: 'Foundation',
}

const currentMajor = computed(() =>
  (majorsStore.majors as Major[]).find((major) => major.acronym === slugToAcronym[slug]),
)

const sortOptions = computed(() => [
  { label: t('common.filterButton.byName'), value: 'name' },
  { label: t('common.filterButton.bySemester1'), value: 'semester1' },
  { label: t('common.filterButton.bySemester2'), value: 'semester2' },
])

const majorOptions = computed(() =>
  (majorsStore.majors as Major[]).map((major) => ({
    label: major.acronym,
    value: major.id,
  })),
)

function sortSubjects(subjects: Subject[], sortBy: SortValue) {
  const sorted = [...subjects]

  if (sortBy === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name))
    return sorted
  }

  if (sortBy === 'semester1' || sortBy === 'semester2') {
    const targetSemester = sortBy === 'semester1' ? 1 : 2
    return sorted
      .filter((subject) => Number(subject.semester) === targetSemester)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  return sorted
}

const filteredSubjects = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  const filtered = (subjectsStore.subjects as Subject[]).filter(
    (subject) => !query || subject.name?.toLowerCase().includes(query),
  )

  return sortSubjects(filtered, selectedSort.value)
})

async function handleCreateSubject(payload: {
  name: string
  major_id: string
  year_level: number
  semester: number
  image: File | null
}) {
  try {
    await subjectsStore.createSubject(payload)
    if (currentMajor.value) {
      await subjectsStore.fetchByMajorAndYear(currentMajor.value.id, yearLevel)
    }
    showAddSubjectModal.value = false
  } catch {
    // Error message is already set in subjects store.
  }
}

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
    <div class="flex md:justify-between md:flex-row flex-col justify-center items-center mb-6 gap-3 md:gap-0">
      <h1 class="text-3xl font-bold text-black">I{{ yearLevel }} - {{ currentMajor?.acronym }}</h1>
      <div class="flex gap-3">
        <SearchButton v-model="searchQuery" placeholder="ស្វែងរក" />
        <FilterButton
          v-model="selectedSort"
          :options="sortOptions"
          :placeholder="t('common.filterButton.sortBy')"
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

    <div v-else class="space-y-6">
      <div class="flex items-center justify-center">
        <div class="grid grid-cols-1 gap-6 md:grid-cols-4">
          <AddnewSubject @open="openCreateModal" />
          <SubjectCard
            v-for="subject in filteredSubjects"
            :key="subject.id"
            :title="subject.name"
            :img="subject.subject_url || subject.image || '/src/assets/images/no-image.png'"
          />
        </div>
      </div>

      <div v-if="subjectsStore.subjects.length === 0" class="text-center text-gray-400">
        No subjects found for this year.
      </div>

      <div v-else-if="filteredSubjects.length === 0" class="text-center text-gray-400">
        No subjects match your search.
      </div>
    </div>
  </div>

  <SubjectCreateModal
    :open="showAddSubjectModal"
    :year-level="yearLevel"
    :default-department-id="currentMajor?.id ?? ''"
    :departments="majorOptions"
    :submitting="subjectsStore.creating"
    :api-error="subjectsStore.createError"
    @close="showAddSubjectModal = false"
    @submit="handleCreateSubject"
  />
</template>
