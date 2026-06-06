<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineEmits<{
  (e: 'open'): void
}>()

const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <button
    type="button"
    class="cursor-pointer flex items-center gap-2 rounded-xl bg-[#008CB9] px-4 py-3 text-sm text-white transition-colors hover:bg-[#00749b] whitespace-nowrap"
    @click="$emit('open')"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="h-4 w-4 fill-white shrink-0">
      <path
        d="M256 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 160-160 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l160 0 0 160c0 17.7 14.3 32 32 32s32-14.3 32-32l0-160 160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-160 0 0-160z"
      />
    </svg>
    {{ t('common.subjectPage.addSubject') }}
  </button>
</template>
