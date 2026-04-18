<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const {t} = useI18n({ useScope: 'global' })
</script>

<template>
  <button type="button" class="group w-70 cursor-pointer rounded-xl text-center">
    <div
      class="flex h-48 w-full items-center justify-center rounded-xl border-2 border-dashed border-[#B9B9B9] bg-[#E6E6E6] transition-colors group-hover:bg-[#DFDFDF] hover:border-[#0057BD]"
    >
      <span
        class="flex h-12 w-12 items-center justify-center rounded-full bg-[#0057BD] text-white shadow-sm transition-transform group-hover:scale-105"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          class="h-8 w-8"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
      </span>
    </div>

    <h2 class="mt-3 text-center text-2xl font-normal leading-tight text-black">
      {{ t('common.subjectPage.addSubject') }}
    </h2>
  </button>
</template>
