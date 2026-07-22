<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = withDefaults(
  defineProps<{
    title?: string
    /** The subject's cover, or null when the submitter uploaded none. */
    img?: string | null
    subjectId: string
    /** Department slug — the route param, not the subject's own slug. */
    departmentSlug: string
    /** The subject's slug, shown in place of a missing cover. */
    subjectSlug: string
    year: number
  }>(),
  { title: '', img: '' },
)

// subject_url is null when no cover was supplied — the backend no longer
// substitutes a placeholder image, so emptiness is the whole test.
const hasImage = computed(() => Boolean(props.img?.trim()))

function goToDocuments() {
  router.push({
    name: 'subject-documents',
    params: {
      slug: props.departmentSlug,
      year: props.year,
      subjectId: props.subjectId,
    },
  })
}
</script>

<template>
  <!-- `group` so hovering anywhere on the card — including the title below the
       frame — drives the border and text colour together. -->
  <div class="group w-70 h-auto rounded-xl cursor-pointer" @click="goToDocuments">
    <div
      class="overflow-hidden h-48 rounded-lg border border-[#D9D9D9] bg-white group-hover:border-[#008CB9] transition-colors"
    >
      <div class="flex h-full w-full items-center justify-center p-3">
        <img
          v-if="hasImage"
          :src="img ?? ''"
          :alt="title || subjectSlug"
          class="block max-h-full max-w-full object-contain"
        />
        <!-- No cover uploaded — show the subject's slug rather than a
             placeholder image, so the card still says something useful. -->
        <span
          v-else
          class="block max-w-full px-2 text-center text-4xl font-bold uppercase tracking-widest text-black transition-colors group-hover:text-[#008CB9]"
        >
          {{ subjectSlug }}
        </span>
      </div>
    </div>
    <h2
      class="mt-3 min-h-13 overflow-hidden text-center text-xl font-normal leading-tight text-black capitalize transition-colors group-hover:text-[#008CB9]"
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
