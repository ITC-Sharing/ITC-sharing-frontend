<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { formatRelativeDate } from '@/utils/format'

const { t } = useI18n({ useScope: 'global' })

type PendingDoc = {
  id: string
  title: string
  doc_type: string
  status: 'pending' | 'rejected'
  rejection_reason?: string | null
  uploaded_at: string
  year_level?: number | null
  academic_year?: string | null
  subjects?: { id: string; name: string } | null
  majors?: { id: string; acronym: string } | null
  document_tags?: { tag: string }[]
}

defineProps<{ docs: PendingDoc[] }>()
defineEmits<{ (e: 'edit', doc: PendingDoc): void; (e: 'remove', doc: PendingDoc): void }>()

const typeColorMap: Record<string, string> = {
  Note: 'bg-blue-100 text-blue-700',
  TD: 'bg-yellow-100 text-yellow-700',
  'Examination paper': 'bg-red-100 text-red-700',
  TP: 'bg-green-100 text-green-700',
  Project: 'bg-purple-100 text-purple-700',
  Lesson: 'bg-orange-100 text-orange-700',
  Thesis: 'bg-teal-100 text-teal-700',
  Other: 'bg-gray-100 text-gray-700',
}
</script>

<template>
  <div v-if="docs.length" class="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col gap-3">
    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">
      {{ t('dashboard.pendingRejected.title') }}
    </p>

    <div
      v-for="doc in docs"
      :key="doc.id"
      class="flex items-start gap-3 rounded-xl border px-3 py-3"
      :class="doc.status === 'rejected' ? 'border-red-100 bg-red-50/40' : 'border-amber-100 bg-amber-50/40'"
    >
      <!-- Doc-type icon -->
      <div
        :class="`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${typeColorMap[doc.doc_type] ?? 'bg-gray-100 text-gray-500'}`"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <p class="text-sm font-semibold text-gray-900 truncate">{{ doc.title }}</p>
          <span
            class="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
            :class="doc.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'"
          >{{ t(`dashboard.pendingRejected.${doc.status}`) }}</span>
        </div>
        <p class="text-xs text-gray-400 mt-0.5">
          {{ doc.majors?.acronym }} &bull; {{ doc.subjects?.name ?? '—' }} &bull;
          {{ formatRelativeDate(doc.uploaded_at) }}
        </p>
        <p v-if="doc.rejection_reason" class="text-xs text-red-500 mt-1">
          {{ t('dashboard.pendingRejected.reason', { reason: doc.rejection_reason }) }}
        </p>
      </div>

      <!-- Actions: user can edit + remove while it's still pending/rejected -->
      <div class="flex items-center gap-1 shrink-0">
        <button
          @click="$emit('edit', doc)"
          class="p-1.5 text-gray-400 hover:text-[#008CB9] hover:bg-white rounded-lg transition-colors"
          :title="t('dashboard.pendingRejected.edit')"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          @click="$emit('remove', doc)"
          class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
          :title="t('dashboard.pendingRejected.remove')"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H9z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
