<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import YearCard from '@/components/YearCard.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import { useMajorsStore } from '@/stores/majors.store'
import { useSubjectsStore } from '@/stores/subjects.store'
import { isLanguageMajor, cefrLevel, LANGUAGE_LEVEL_COUNT } from '@/utils/format'

const props = defineProps<{ slug: string }>()
const { t } = useI18n({ useScope: 'global' })
const majorsStore = useMajorsStore()
const subjectsStore = useSubjectsStore()

// Match by lowercased acronym — no hardcoded map needed
const currentMajor = computed(() =>
  majorsStore.majors.find(
    (m: { id: string; name: string; acronym: string; image_url: string | null }) =>
      m.acronym.toLowerCase() === props.slug,
  ),
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

const filteredYears = computed(() => {
  // Year cards use the major's own image (falling back to the year illustration).
  const majorImg = (fallback: string) => currentMajor.value?.image_url ?? fallback
  // English & French: years 1–4 are CEFR levels (A1–B2), year 5 is a normal year.
  if (isLanguageMajor(props.slug)) {
    return Array.from({ length: LANGUAGE_LEVEL_COUNT }, (_, i) => {
      const n = i + 1
      return {
        id: n,
        label: cefrLevel(props.slug, n) ?? t(`common.departmentPage.year${n}`),
        subtitle: t('common.departmentPage.subject'),
        img: majorImg(years[i]!.img),
      }
    })
  }
  const subset =
    props.slug === 'foundation' ? years.filter((y) => y.id <= 2) : years.filter((y) => y.id >= 3)
  return subset.map((y) => ({
    id: y.id,
    label: t(y.title),
    subtitle: t(y.subtitle),
    img: majorImg(y.img),
  }))
})

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
  <div class="mx-auto w-full max-w-7xl px-6 mb-6 cursor-pointer">
    <Breadcrumb
      :items="[
        { label: t('common.nav.home'), to: { name: 'home' } },
        { label: currentMajor?.acronym ?? props.slug.toUpperCase() },
      ]"
    />
  </div>

  <div class="mb-6 flex flex-col items-center justify-center gap-4">
    <div
      v-if="currentMajor?.image_url"
      class="flex h-50 w-50 items-center justify-center overflow-hidden rounded-md"
    >
      <img
        :src="currentMajor.image_url"
        :alt="currentMajor.acronym"
        class="h-full w-full object-contain"
      />
    </div>
    <div class="flex md:w-full w-90 justify-center items-center">
      <h1 class="text-center text-xl font-semibold text-black">
        {{ currentMajor?.name ?? 'Department Not Found' }}
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
        :title="year.label"
        :subtitle="year.subtitle"
        :img="year.img"
        :slug="props.slug"
        :year="year.id"
        :subjectCount="subjectsStore.countsByYear[year.id] ?? 0"
      />
    </div>
  </div>
</template>
