<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
defineProps({
  title: {
    type: String,
    default: 'Subject Name',
  },
  tags: {
    type: Array as () => string[],
    default: () => ['lab', 'exercises', 'config router'],
  },
  fileCount: {
    type: Number,
    default: 7,
  },
  folderCount: {
    type: Number,
    default: 1,
  },
  sizeText: {
    type: String,
    default: '67 MB',
  },
  author: {
    type: String,
    default: 'rothcoolkid',
  },
  dateText: {
    type: String,
    default: '03/06/2026',
  },
  img: {
    type: String,
    default: '/src/assets/images/assignment.jpg',
  },
})

const tagClasses = [
  'border-[#1AA8E5] bg-[#B8EDFF] text-[#0082B8]',
  'border-[#D4B100] bg-[#FFF4A6] text-[#C39D00]',
  'border-[#3FBE4E] bg-[#AEF7B9] text-[#1F9A2D]',
]
</script>

<template>
  <article class="w-full max-w-90 rounded-lg border bg-white border-[#B9B9B9] px-5 py-7">
    <div class="flex items-center justify-center pb-3">
      <img :src="img" alt="Document Icon" class="h-30 w-40 object-contain" />
    </div>

    <div class="h-px bg-[#C7C7C7]"></div>

    <h2 class="mt-3 text-2xl font-semibold leading-tight text-black">
      {{ title }}
    </h2>

    <div class="mt-4 flex flex-wrap gap-1">
      <span
        v-for="(tag, index) in tags"
        :key="`${tag}-${index}`"
        class="inline-flex items-center rounded-full border px-5 py-1 text-md leading-none"
        :class="tagClasses[index % tagClasses.length]"
      >
        {{ tag }}
      </span>
    </div>

    <p class="mt-5 text-sm leading-none text-[#9E9E9E]">
      {{ fileCount }} file&nbsp;&nbsp; {{ folderCount }} folder &nbsp;•&nbsp; {{ sizeText }}
    </p>

    <p class="mt-3 text-sm font-semibold leading-none text-[#9E9E9E]">
      by {{ author }} &nbsp;•&nbsp; Date: {{ dateText }}
    </p>

    <div class="mt-7 grid grid-cols-2 gap-6">
      <button
        type="button"
        class="rounded-xl border border-[#B0B0B0] bg-white px-2 py-2 text-lg leading-none text-black transition-colors cursor-pointer"
      >
        {{ t('common.DocumentCard.viewDetails') }}
      </button>
      <button
        type="button"
        class="rounded-xl bg-[#1F69F5] px-4 py-3 text-lg leading-none text-white transition-colors hover:bg-[#1B58D1] cursor-pointer"
      >
        {{ t('common.DocumentCard.download') }}
      </button>
    </div>
  </article>
</template>
