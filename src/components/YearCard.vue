<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '0 មុខវិជ្ជា' },
  img: { type: String, default: '/src/assets/images/non-photo.jpg' },
  slug: { type: String, required: true }, // ← department slug e.g. "gic"
  year: { type: Number, required: true }, // ← year number e.g. 3
  subjectCount: { type: Number, default: 0 },
})

function goToWhichYear() {
  router.push(`/department/${props.slug}/year/${props.year}`)
}
</script>

<template>
  <div
    class="w-90 rounded-md border border-[#D9D9D9] bg-white px-6 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
  >
    <div class="flex flex-col items-center text-center">
      <img :src="img" :alt="title" class="h-30 rounded-md" />

      <h2 class="text-2xl font-semibold leading-none text-black">
        {{ title }}
      </h2>

      <p class="mt-2 text-sm font-normal text-[#B8B8B8]"><span>{{ subjectCount }}</span> {{ subtitle }}</p>

      <button
        type="button"
        @click="goToWhichYear"
        class="mt-4 inline-flex items-center justify-center rounded-md bg-[#008CB9] px-4 py-2 text-sm font-medium leading-none text-white transition-colors hover:bg-[#00749b] focus:outline-none focus:ring-4 focus:ring-[#D1E9FF] cursor-pointer"
      >
        {{ t('common.departmentPage.enter') }}
      </button>
    </div>
  </div>
</template>
