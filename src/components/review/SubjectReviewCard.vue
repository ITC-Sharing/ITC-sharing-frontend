<script setup lang="ts">
import { computed } from 'vue'
import { formatRelativeDate, yearMajorLabel } from '@/utils/format'

/**
 * One pending subject, as a card.
 *
 * The phone counterpart to SubjectReviewTable, and a sibling of
 * DocumentReviewCard: the two queues are reviewed the same way, so they read
 * the same on a phone. Presentation only — the decision leaves as an event.
 */
export interface SubjectCardRow {
  id: string
  name: string
  acronym?: string | null
  semester?: string | number
  year_level?: number | null
  majors?: { acronym?: string } | null
  users?: { first_name?: string; last_name?: string } | null
  created_at?: string
}

const props = defineProps<{
  subject: SubjectCardRow
  actioningId?: string | null
}>()

const emit = defineEmits<{ (e: 'action', key: string, subject: SubjectCardRow): void }>()

/** Set while this subject's approve/reject is in flight. */
const busy = computed(() => props.actioningId === props.subject.id)

const submitter = computed(() =>
  `${props.subject.users?.first_name ?? ''} ${props.subject.users?.last_name ?? ''}`.trim(),
)

/** "I3-GIC" — the cohort the subject was proposed for. */
const levelLabel = computed(() =>
  yearMajorLabel(props.subject.majors?.acronym, props.subject.year_level),
)

/** First letters of the name, the same stand-in the table's avatar uses. */
const initials = computed(() => props.subject.name.slice(0, 3).toUpperCase())
</script>

<template>
  <article class="overflow-hidden rounded-xl border border-gray-200 bg-white">
    <!-- The subject itself. No expand and no destination: a subject is its
         name, a semester and a cohort — there is nothing further to open. -->
    <div class="flex items-start gap-3 px-4 py-3">
      <span
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-[11px] font-bold text-primary"
      >
        {{ initials }}
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-base font-semibold leading-tight text-black" :title="subject.name">
          {{ subject.name }}
        </p>
        <p v-if="subject.acronym" class="mt-0.5 truncate text-xs text-gray-400">
          {{ subject.acronym }}
        </p>
      </div>
    </div>

    <div class="h-px bg-gray-100"></div>

    <dl class="flex flex-col gap-1.5 px-4 py-3 text-xs">
      <div class="flex items-center justify-between gap-2">
        <dt class="text-gray-500">Submitted by</dt>
        <dd class="truncate font-medium text-gray-700">{{ submitter || '—' }}</dd>
      </div>
      <div v-if="subject.created_at" class="flex items-center justify-between gap-2">
        <dt class="text-gray-500">Submitted</dt>
        <dd class="font-medium text-gray-700">{{ formatRelativeDate(subject.created_at) }}</dd>
      </div>
      <div class="flex items-center justify-between gap-2">
        <dt class="text-gray-500">Major</dt>
        <dd class="font-medium text-gray-700">{{ levelLabel }}</dd>
      </div>
      <div v-if="subject.semester" class="flex items-center justify-between gap-2">
        <dt class="text-gray-500">Semester</dt>
        <dd class="font-medium text-gray-700">{{ subject.semester }}</dd>
      </div>
    </dl>

    <!-- Same two buttons, colours and wording as the document card, so one
         decision looks the same whichever queue it is made in. -->
    <div class="flex items-center gap-2 border-t border-gray-100 px-4 py-3">
      <button
        type="button"
        class="flex-1 rounded-x border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:cursor-pointer disabled:opacity-50"
        :disabled="busy"
        @click="emit('action', 'reject', subject)"
      >
        Reject
      </button>
      <button
        type="button"
        class="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:cursor-pointer hover:bg-primary-hover disabled:opacity-50"
        :disabled="busy"
        @click="emit('action', 'approve', subject)"
      >
        Approve
      </button>
    </div>
  </article>
</template>
