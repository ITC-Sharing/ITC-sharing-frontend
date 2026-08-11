<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import YearCard from '@/components/departments/YearCard.vue'
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import { useMajorsStore } from '@/stores/majors.store'
import { useSubjectsStore } from '@/stores/subjects.store'
import { isLanguageMajor, languageLabelKey, yearLevelsForMajor } from '@/utils/format'
import englishFlag from '@/assets/images/english_flag.png'
import frenchFlag from '@/assets/images/france_flag.png'

// DFL's cards are languages, so they carry a flag instead of the department's
// logo. Indexed by year_level (1 = English, 2 = French).
const DFL_LANGUAGE_IMAGES = [englishFlag, frenchFlag]

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

const filteredYears = computed(() => {
  // Year cards use the major's image from the server; YearCard shows its own
  // placeholder when the major has no image_url.
  const img = currentMajor.value?.image_url ?? undefined
  // Foundation covers years 1–2 and departments 3–5. DFL lists its languages
  // (English, French) in the same slot — the levels below those are subjects.
  return yearLevelsForMajor(props.slug).map((n) => {
    const languageKey = languageLabelKey(props.slug, n)
    return {
      id: n,
      label: languageKey ? t(languageKey) : t(`common.departmentPage.year${n}`),
      subtitle: t('common.departmentPage.subject'),
      img: languageKey ? DFL_LANGUAGE_IMAGES[n - 1] : img,
    }
  })
})

// DFL asks for a language instead of an academic year.
const chooseHeading = computed(() =>
  isLanguageMajor(props.slug)
    ? t('common.departmentPage.chooseLanguage')
    : t('common.departmentPage.chooseYear'),
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
      <h1 class="w-full text-xl text-black">{{ chooseHeading }}</h1>
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
