<script setup lang="ts">
import RowActionsMenu from '@/components/base/RowActionsMenu.vue'
import { formatRelativeDate, yearMajorLabel } from '@/utils/format'

/**
 * The pending-subjects table, shared by the admin dashboard and the moderator
 * review page so the two cannot drift apart.
 *
 * Presentation only. Rows arrive already filtered and paged, and every action
 * leaves as an event — the page that owns the queue owns what happens to it.
 * That keeps the admin screen's filters, paging and counts exactly where they
 * were while still giving both pages one table.
 */
/** Matches the admin table's own date format. */
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface SubjectRow {
  id: string
  name: string
  semester?: string | number
  acronym?: string | null
  subject_url?: string | null
  year_level?: number | null
  majors?: { acronym?: string } | null
  users?: { first_name?: string; last_name?: string } | null
  created_at?: string
}

const props = defineProps<{
  rows: SubjectRow[]
  /** Which row is open for inline editing, and its working values. */
  editingId?: string | null
  editName?: string
  editSemester?: string
  savingId?: string | null
  /** The row an action is in flight for; its controls are disabled. */
  actioningId?: string | null
  /** Actions offered in each row's menu. Omit for a read-only table. */
  actions?: { key: string; label: string; tone?: 'danger' | 'success' }[]
}>()

const emit = defineEmits<{
  (e: 'action', key: string, subject: SubjectRow): void
  (e: 'save', subject: SubjectRow): void
  (e: 'cancel-edit'): void
  (e: 'update:editName', value: string): void
  (e: 'update:editSemester', value: string): void
}>()
</script>

<template>
  <div
    class="flex min-h-0 flex-col overflow-y-auto overscroll-none rounded-2xl border border-gray-100 bg-white scrollbar-primary"
  >
    <div
      class="sticky top-0 z-20 grid grid-cols-12 gap-4 border-t border-white bg-primary px-6 py-3"
    >
      <p class="col-span-4 text-xs font-semibold text-white uppercase tracking-wide">Subject</p>
      <!-- No Year column: the Major cell already reads "I3-GIC",
       which is the year and the department together. -->
      <p class="col-span-2 text-xs font-semibold text-white uppercase tracking-wide">Major</p>
      <p class="col-span-1 text-xs font-semibold text-white uppercase tracking-wide">Sem</p>
      <p class="col-span-2 text-xs font-semibold text-white uppercase tracking-wide">
        Submitted by
      </p>
      <p
        class="col-span-2 whitespace-nowrap text-xs font-semibold text-white uppercase tracking-wide"
      >
        Submitted
      </p>
      <p class="col-span-1 text-right text-xs font-semibold text-white uppercase tracking-wide">
        Actions
      </p>
    </div>

    <div
      v-for="(subject, i) in props.rows"
      :key="subject.id"
      :class="['transition-colors', i !== props.rows.length - 1 ? 'border-b border-gray-100' : '']"
    >
      <div class="grid grid-cols-12 items-center gap-4 px-6 py-4 hover:bg-gray-50">
        <div class="col-span-4 flex min-w-0 items-center gap-3">
          <img
            v-if="subject.subject_url"
            :src="subject.subject_url"
            class="h-9 w-9 shrink-0 rounded-xl object-cover"
          />
          <div
            v-else
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 px-1 text-[11px] font-bold text-primary"
          >
            <span class="truncate">{{ subject.acronym ?? '—' }}</span>
          </div>
          <p class="truncate text-sm font-medium text-gray-900">{{ subject.name }}</p>
        </div>

        <p class="col-span-2 truncate text-sm text-gray-600">
          {{ yearMajorLabel(subject.majors?.acronym, subject.year_level) }}
        </p>
        <p class="col-span-1 text-sm text-gray-600">{{ subject.semester }}</p>
        <p class="col-span-2 truncate text-sm text-gray-600">
          {{ subject.users ? `${subject.users.first_name} ${subject.users.last_name}` : 'Unknown' }}
        </p>
        <p
          class="col-span-2 whitespace-nowrap text-xs text-gray-400"
          :title="subject.created_at ? formatDate(subject.created_at) : ''"
        >
          {{ subject.created_at ? formatRelativeDate(subject.created_at) : '—' }}
        </p>

        <div class="col-span-1 flex items-center justify-end">
          <RowActionsMenu
            :disabled="props.actioningId === subject.id"
            :items="[
              { key: 'edit', label: 'Edit' },
              { key: 'approve', label: 'Approve', tone: 'success' },
              { key: 'reject', label: 'Reject', tone: 'danger' },
              { key: 'delete', label: 'Delete', tone: 'danger' },
            ]"
            @select="(key) => emit('action', key, subject)"
          />
        </div>
      </div>

      <!-- Inline edit -->
      <div
        v-if="props.editingId === subject.id"
        class="px-6 pb-4 bg-blue-50/40 border-t border-blue-100"
      >
        <div class="flex items-end gap-3 pt-3 flex-wrap">
          <div class="flex flex-col gap-1 flex-1 min-w-40">
            <label class="text-xs font-medium text-gray-500">Name</label>
            <input
              :value="props.editName"
              @input="emit('update:editName', ($event.target as HTMLInputElement).value)"
              class="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0057BD] bg-white"
            />
          </div>
          <div class="flex flex-col gap-1 w-36">
            <label class="text-xs font-medium text-gray-500">Semester</label>
            <select
              :value="props.editSemester"
              @input="emit('update:editSemester', ($event.target as HTMLInputElement).value)"
              class="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white"
            >
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
          </div>
          <div class="flex gap-2">
            <button
              @click="emit('save', subject)"
              :disabled="props.savingId === subject.id"
              class="px-4 py-2 text-sm font-semibold bg-[#0057BD] hover:bg-[#0948A0] text-white rounded-xl transition-colors disabled:opacity-50"
            >
              {{ props.savingId === subject.id ? 'Saving…' : 'Save' }}
            </button>
            <button
              @click="emit('cancel-edit')"
              class="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
