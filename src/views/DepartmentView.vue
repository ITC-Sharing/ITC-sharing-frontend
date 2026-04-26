<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import YearCard from '@/components/YearCard.vue'
import { useMajorsStore } from '@/stores/majors.store'
import { useSubjectsStore } from '@/stores/subjects.store'

const props = defineProps<{ slug: string }>()
const { t } = useI18n({ useScope: 'global' })
const majorsStore = useMajorsStore()
const subjectsStore = useSubjectsStore()

const departments = [
  {
    name: 'GIC',
    slug: 'gic',
    acronym: 'GIC',
    img: '/src/assets/images/department/gic2.png',
    fname: 'Department of Information and Communication Engineering',
  },
  {
    name: 'AMS',
    slug: 'ams',
    acronym: 'AMS',
    img: '/src/assets/images/department/ams-removebg.png',
    fname: 'Department of Applied Mathematics and Statistics',
  },
  {
    name: 'GIM',
    slug: 'gim',
    acronym: 'GIM',
    img: '/src/assets/images/department/gim-removebg.png',
    fname: 'Department of Industrial and Mechanical Engineering',
  },
  {
    name: 'GTR',
    slug: 'gtr',
    acronym: 'GTR',
    img: '/src/assets/images/department/gtr-removebg.png',
    fname: 'Department of Telecommunication and Network Engineering',
  },
  {
    name: 'GCA',
    slug: 'gca',
    acronym: 'GCA',
    img: '/src/assets/images/department/gca-removebg.png',
    fname: 'Department of Computer Applications',
  },
  {
    name: 'GAR',
    slug: 'gar',
    acronym: 'GAR',
    img: '/src/assets/images/department/gar-removebg.png',
    fname: 'Department of Architecture',
  },
  {
    name: 'GRU',
    slug: 'gru',
    acronym: 'GRU',
    img: '/src/assets/images/department/gru.png',
    fname: 'Department of Rural Development',
  },
  {
    name: 'GTI',
    slug: 'gti',
    acronym: 'GTI',
    img: '/src/assets/images/department/gti-removebg.png',
    fname: 'Department of Information Technology',
  },
  {
    name: 'GEE',
    slug: 'gee',
    acronym: 'GEE',
    img: '/src/assets/images/department/gee-removebg.png',
    fname: 'Department of Electrical Engineering',
  },
  {
    name: 'Foundation Year',
    slug: 'foundation',
    acronym: 'Foundation',
    img: '/src/assets/images/department/itc-removebg.png',
    fname: 'Foundation Year',
  },
]

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

const selectedDepartment = computed(() => departments.find((d) => d.slug === props.slug))

const currentMajor = computed(() =>
  majorsStore.majors.find((m: any) => m.acronym === slugToAcronym[props.slug]),
)

const years = [
  {
    id: 1,
    title: 'common.departmentPage.year1',
    subtitle: 'common.departmentPage.subject',
    img: '/src/assets/images/year/year3.jpg',
  },
  {
    id: 2,
    title: 'common.departmentPage.year2',
    subtitle: 'common.departmentPage.subject',
    img: '/src/assets/images/year/year4.jpg',
  },
  {
    id: 3,
    title: 'common.departmentPage.year3',
    subtitle: 'common.departmentPage.subject',
    img: '/src/assets/images/year/year3.jpg',
  },
  {
    id: 4,
    title: 'common.departmentPage.year4',
    subtitle: 'common.departmentPage.subject',
    img: '/src/assets/images/year/year4.jpg',
  },
  {
    id: 5,
    title: 'common.departmentPage.year5',
    subtitle: 'common.departmentPage.subject',
    img: '/src/assets/images/year/year5.jpg',
  },
]

const filteredYears = computed(() =>
  props.slug === 'foundation' ? years.filter((y) => y.id <= 2) : years.filter((y) => y.id >= 3),
)

async function loadCounts() {
  if (!majorsStore.majors.length) await majorsStore.fetchMajors()
  if (currentMajor.value) {
    await subjectsStore.fetchCountsByMajor(currentMajor.value.id)
  }
}

onMounted(loadCounts)

// Re-fetch if slug changes without page reload (navigating dept → dept)
watch(() => props.slug, loadCounts)
</script>

<template>
  <div class="mb-6 flex flex-col items-center justify-center gap-4">
    <div
      v-if="selectedDepartment"
      class="flex h-50 w-50 items-center justify-center overflow-hidden rounded-md"
    >
      <img
        :src="selectedDepartment.img"
        :alt="selectedDepartment.name"
        class="h-full w-full object-contain"
      />
    </div>
    <div class="flex md:w-full w-90 justify-center items-center">
      <h1 class="text-center text-xl font-semibold text-black">
        {{ selectedDepartment ? selectedDepartment.fname : 'Department Not Found' }}
      </h1>
    </div>
  </div>

  <div class="mx-auto flex w-full max-w-6xl flex-col items-center justify-center px-4 gap-6">
    <div class="flex w-full items-start justify-start">
      <h1 class="w-full text-xl text-black">{{ t('common.departmentPage.chooseYear') }}</h1>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <YearCard
        v-for="year in filteredYears"
        :key="year.id"
        :title="t(year.title)"
        :subtitle="t(year.subtitle)"
        :img="year.img"
        :slug="props.slug"
        :year="year.id"
        :subjectCount="subjectsStore.countsByYear[year.id] ?? 0"
      />
    </div>
  </div>
</template>
