<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { isLanguageMajor } from '@/utils/format'

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    /** The major's image. Null when it has none. */
    img?: string | null
    /** Department slug e.g. "gic" */
    slug: string
    /** Year number e.g. 3 */
    year: number
    subjectCount?: number
  }>(),
  { title: '', subtitle: '0 មុខវិជ្ជា', img: '', subjectCount: 0 },
)

// Majors without an image_url would otherwise render an empty <img>, i.e. a
// broken-image icon — skip the element entirely instead.
const hasImage = computed(() => Boolean(props.img?.trim()))

function goToWhichYear() {
  // English & French have no subjects — jump straight to the level's documents.
  if (isLanguageMajor(props.slug)) {
    router.push(`/department/${props.slug}/year/${props.year}/documents`)
  } else {
    router.push(`/department/${props.slug}/year/${props.year}`)
  }
}

function handleCardClick() {
  if (window.innerWidth < 640) goToWhichYear()
}
</script>

<template>
  <div
    class="w-80 rounded-md border border-[#D9D9D9] bg-white px-6 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.08)] sm:cursor-default cursor-pointer active:scale-95 transition-transform sm:active:scale-100"
    @click="handleCardClick"
  >
    <div class="flex flex-col items-center text-center">
      <img v-if="hasImage" :src="img ?? ''" :alt="title" class="h-20 rounded-md" />

      <h2 class="text-xl font-semibold leading-none text-black mt-3">
        {{ title }}
      </h2>

      <p v-if="!isLanguageMajor(slug)" class="mt-2 text-sm font-normal text-[#B8B8B8]"><span>{{ subjectCount }}</span> {{ subtitle }}</p>

      <button
        type="button"
        @click.stop="goToWhichYear"
        class="mt-4 hidden sm:inline-flex items-center justify-center rounded-md bg-[#008CB9] px-4 py-2 text-sm font-medium leading-none text-white transition-colors hover:bg-[#00749b] focus:outline-none focus:ring-4 focus:ring-[#D1E9FF] cursor-pointer"
      >
        {{ t('common.departmentPage.enter') }}
      </button>
    </div>
  </div>
</template>
