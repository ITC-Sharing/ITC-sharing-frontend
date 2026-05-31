<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSubjectsStore } from '@/stores/subjects.store'
import { useMajorsStore } from '@/stores/majors.store'
import SubjectCard from '@/components/SubjectCard.vue'
import SearchButton from '@/components/SearchButton.vue'
import FilterButton from '@/components/FilterButton.vue'
import AddnewSubject from '@/components/AddnewSubject.vue'
import SubjectCreateModal from '@/components/SubjectCreateModal.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import Breadcrumb from '@/components/BreadCrumb.vue'

const route = useRoute()
const { t } = useI18n({ useScope: 'global' })
const subjectsStore = useSubjectsStore()
const majorsStore = useMajorsStore()

type Major = { id: string; acronym: string; name: string }
type FilterValue = 'name' | 'semester1' | 'semester2'

const slug = route.params.slug as string
const yearLevel = Number(route.params.year)
const searchQuery = ref('')
const selectedFilter = ref<FilterValue>('name')
const showAddSubjectModal = ref(false)
const submitSuccess = ref(false)

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
  (majorsStore.majors as Major[]).find((m) => m.acronym === slugToAcronym[slug]),
)

const majorOptions = computed(() =>
  (majorsStore.majors as Major[]).map((m) => ({ label: m.acronym, value: m.id })),
)

const filterOptions = computed(() => [
  { label: t('common.filterButton.default'), value: 'name' },
  { label: t('common.filterButton.bySemester1'), value: 'semester1' },
  { label: t('common.filterButton.bySemester2'), value: 'semester2' },
])

// Sort by name is still client-side (presentation only, no data change)
const displayedSubjects = computed(() => {
  const list = [...subjectsStore.subjects]
  if (selectedFilter.value === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
  return list
})

function buildFetchOptions() {
  const semester =
    selectedFilter.value === 'semester1' ? 1 : selectedFilter.value === 'semester2' ? 2 : undefined
  return { semester, search: searchQuery.value || undefined }
}

async function fetchSubjects() {
  if (!currentMajor.value) return
  await subjectsStore.fetchByMajorAndYear(currentMajor.value.id, yearLevel, buildFetchOptions())
}

// Debounce search to avoid a request on every keystroke
let searchTimer: ReturnType<typeof setTimeout>
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(fetchSubjects, 300)
})

watch(selectedFilter, () => {
  fetchSubjects()
})

function openCreateModal() {
  subjectsStore.createError = null
  showAddSubjectModal.value = true
}

async function handleCreateSubject(payload: {
  name: string
  slug: string
  major_id: string
  year_level: number
  semester: number
  image: File | null
}) {
  try {
    await subjectsStore.createSubject(payload)
    showAddSubjectModal.value = false
    submitSuccess.value = true
    setTimeout(() => (submitSuccess.value = false), 4000)
  } catch {
    // error shown via subjectsStore.createError
  }
}

onMounted(async () => {
  if (!majorsStore.majors.length) await majorsStore.fetchMajors()
  await fetchSubjects()
})
</script>

<template>
  <div>
    <div class="mx-auto w-full max-w-7xl px-6">
      <!-- Breadcrumb -->
      <div class="mb-4">
        <Breadcrumb
          :items="[
            { label: t('common.nav.home'), to: { name: 'home' } },
            {
              label: slugToAcronym[slug] ?? slug.toUpperCase(),
              to: { name: 'department', params: { slug } },
            },
            { label: t('common.documentsPage.year', { year: yearLevel }) },
          ]"
        />
      </div>

      <!-- Submit success toast -->
      <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="submitSuccess"
          class="mb-4 flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 shrink-0 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          {{ t('common.subjectPage.submitmsg') }}
        </div>
      </Transition>

      <!-- Header -->
      <div
        class="flex md:justify-between md:flex-row flex-col justify-center mb-6 gap-3 md:gap-0"
      >
        <h1 class="text-3xl font-bold text-black">
          I{{ yearLevel }} - {{ currentMajor?.acronym }}
        </h1>
        <div class="flex gap-3 md:flex-row flex-col">
          <SearchButton v-model="searchQuery" placeholder="ស្វែងរក" />

          <!-- desktop -->
          <div class="hidden md:flex items-center gap-3">
            <FilterButton
              v-model="selectedFilter"
              :options="filterOptions"
              :placeholder="t('common.filterButton.sortBy')"
              class="w-72"
            />
            <AddnewSubject @open="openCreateModal" />
          </div>

          <!-- mobile -->
          <div class="flex justify-between items-center gap-2 md:hidden">
            <div class="w-40">
              <FilterButton
                v-model="selectedFilter"
                :options="filterOptions"
                :placeholder="t('common.filterButton.sortBy')"
              />
            </div>
            <AddnewSubject @open="openCreateModal" />
          </div>
        </div>
      </div>

      <div class="mb-3 flex flex-col gap-3 md:flex-row md:items-center"></div>

      <!-- Loading -->
      <div v-if="subjectsStore.loading" class="flex justify-center py-20">
        <LoadingSpinner />
      </div>

      <!-- Error -->
      <div v-else-if="subjectsStore.error" class="text-center py-20 text-red-500">
        {{ subjectsStore.error }}
      </div>

      <div v-else class="space-y-6">
        <div class="flex items-center justify-center">
          <div class="grid grid-cols-1 gap-6 md:grid-cols-4">
            <SubjectCard
              v-for="subject in displayedSubjects"
              :key="subject.id"
              :title="subject.name"
              :img="subject.subject_url || '/src/assets/images/no-image.png'"
              :subjectId="subject.id"
              :slug="slug"
              :year="yearLevel"
            />
          </div>
        </div>

        <div v-if="displayedSubjects.length === 0" class="text-center text-gray-400">
          {{ t('common.subjectPage.noSubjects') }}
        </div>
      </div>
    </div>
    <SubjectCreateModal
      v-if="showAddSubjectModal"
      :open="showAddSubjectModal"
      :year-level="yearLevel"
      :default-department-id="currentMajor?.id ?? ''"
      :departments="majorOptions"
      :submitting="subjectsStore.creating"
      :api-error="subjectsStore.createError"
      @close="showAddSubjectModal = false"
      @submit="handleCreateSubject"
    />
  </div>
</template>
