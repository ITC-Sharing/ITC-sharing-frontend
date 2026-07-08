<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  title: { type: String, default: 'Database' },
  img: { type: String, default: '' },
  subjectId: { type: String, required: true }, // ← add this
  slug: { type: String, required: true }, // ← and this (department slug)
  year: { type: Number, required: true }, // ← and this
})

function goToDocuments() {
  router.push({
    name: 'subject-documents',
    params: {
      slug: props.slug,
      year: props.year,
      subjectId: props.subjectId,
    },
  })
}
</script>

<template>
  <div class="w-70 h-auto rounded-xl cursor-pointer" @click="goToDocuments">
    <div
      class="overflow-hidden h-48 rounded-lg border border-[#D9D9D9] bg-white hover:border-[#008CB9] transition-colors"
    >
      <div class="flex h-full w-full items-center justify-center p-3">
        <img :src="img" alt="Subject" class="block max-h-full max-w-full object-contain" />
      </div>
    </div>
    <h2
      class="mt-3 min-h-13 overflow-hidden text-center text-xl font-normal leading-tight text-black capitalize"
      style="
        display: -webkit-box;
        line-clamp: 2;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      "
    >
      {{ title }}
    </h2>
  </div>
</template>
