<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import RingSpinner from '@/components/common/RingSpinner.vue'

const { t } = useI18n({ useScope: 'global' })

defineProps<{
  message?: string
}>()
</script>

<template>
  <div class="inline-flex items-center gap-3">
    <RingSpinner :size="24" class="text-gray-400" :label="message || t('common.common.loading')" />

    <p class="font-medium text-gray-500">{{ message || t('common.common.loading') }}</p>
  </div>
</template>
