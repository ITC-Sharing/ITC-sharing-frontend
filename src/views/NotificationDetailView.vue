<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useDocumentsStore } from '@/stores/documents.store'
import { useSubjectsStore } from '@/stores/subjects.store'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const notifStore = useNotificationsStore()
const docs = useDocumentsStore()
const subjectsStore = useSubjectsStore()

const notifId = computed(() => String(route.query.notif_id ?? ''))
const refId   = computed(() => String(route.query.ref_id   ?? ''))
const refType = computed(() => String(route.query.ref_type ?? ''))

const notification = computed(() => notifStore.notifications.find((n) => n.id === notifId.value))
const isRejected   = computed(() => notification.value?.type?.includes('rejected') ?? false)

const upload  = computed(() => docs.myUploads.find((u) => u.id === refId.value) ?? null)
const subject = computed(() => subjectsStore.mySubjects.find((s) => s.id === refId.value) ?? null)

const loading = computed(() => docs.loading || subjectsStore.loading)

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  const now  = new Date()
  const diffSec  = Math.floor((now.getTime() - date.getTime()) / 1000)
  const diffMin  = Math.floor(diffSec  / 60)
  const diffHour = Math.floor(diffMin  / 60)
  const diffDay  = Math.floor(diffHour / 24)
  if (diffSec  < 60)  return 'just now'
  if (diffMin  < 60)  return `${diffMin} min ago`
  if (diffHour < 24)  return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  if (diffDay  <= 3)  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getFileIcon(name: string | null | undefined): { bg: string; label: string } {
  const ext = (name ?? '').split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return { bg: 'bg-red-500', label: 'PDF' }
  if (['doc', 'docx'].includes(ext)) return { bg: 'bg-blue-500', label: 'DOC' }
  if (['xls', 'xlsx'].includes(ext)) return { bg: 'bg-green-500', label: 'XLS' }
  if (['ppt', 'pptx'].includes(ext)) return { bg: 'bg-orange-500', label: 'PPT' }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return { bg: 'bg-purple-500', label: 'IMG' }
  if (['zip', 'rar', '7z'].includes(ext)) return { bg: 'bg-yellow-500', label: 'ZIP' }
  return { bg: 'bg-gray-400', label: ext.toUpperCase() || 'FILE' }
}

function formatDocType(type: string): string {
  return type
}

onMounted(async () => {
  if (notifId.value && notification.value && !notification.value.is_read) {
    await notifStore.markRead(notifId.value)
  }
  if (refType.value === 'document') await docs.fetchMine()
  if (refType.value === 'subject')  await subjectsStore.fetchMine()
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-8">
    <!-- Back -->
    <div class="flex items-center gap-2 text-sm text-gray-400 mb-6">
      <button
        class="flex items-center gap-1 hover:text-gray-700 transition-colors"
        @click="router.back()"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <!-- ── Rejected document ──────────────────────────────────────────────── -->
    <template v-else-if="refType === 'document' && upload">
      <!-- Rejection reason -->
      <div
        v-if="upload.rejection_reason"
        class="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 mb-4 flex items-start gap-3"
      >
        <svg class="shrink-0 w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <div>
          <p class="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Reason for rejection</p>
          <p class="text-sm text-red-700">{{ upload.rejection_reason }}</p>
        </div>
      </div>

      <!-- Upload info -->
      <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wide">Upload Details</p>
        </div>
        <div class="divide-y divide-gray-50">
          <div class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Title</span>
            <span class="text-sm font-medium text-gray-800">{{ upload.title || '—' }}</span>
          </div>
          <div class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Type</span>
            <span class="text-sm font-medium text-gray-800">{{ upload.doc_type ? formatDocType(upload.doc_type) : '—' }}</span>
          </div>
          <div v-if="upload.subjects?.name" class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Subject</span>
            <span class="text-sm font-medium text-gray-800">{{ upload.subjects.name }}</span>
          </div>
          <div v-if="upload.majors?.acronym" class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Major</span>
            <span class="text-sm font-medium text-gray-800">{{ upload.majors.acronym }}</span>
          </div>
          <div class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Submitted</span>
            <span class="text-sm font-medium text-gray-800">{{ formatDate(upload.uploaded_at) }}</span>
          </div>
          <div class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Rejected</span>
            <span class="text-sm font-medium text-gray-800">{{ formatDate(upload.rejected_at) }}</span>
          </div>
        </div>
      </div>

      <!-- Files (read-only — storage deleted on rejection) -->
      <div v-if="upload.documents?.length" class="rounded-2xl border border-gray-200 bg-white overflow-hidden mt-4">
        <div class="px-5 py-4 border-b border-gray-100">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Submitted Files
            <span class="normal-case text-gray-300 ml-1">(removed from storage)</span>
          </p>
        </div>
        <div
          v-for="(file, idx) in upload.documents"
          :key="file.id"
          class="flex items-center gap-3 px-4 py-3"
          :class="idx !== upload.documents.length - 1 ? 'border-b border-gray-50' : ''"
        >
          <div :class="['shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white', getFileIcon(file.original_name).bg]">
            {{ getFileIcon(file.original_name).label }}
          </div>
          <span class="flex-1 truncate text-sm text-gray-700">{{ file.original_name || 'Unnamed file' }}</span>
          <span class="shrink-0 text-sm text-gray-400">
            {{ file.file_size_kb < 1024 ? `${file.file_size_kb} KB` : `${(file.file_size_kb / 1024).toFixed(1)} MB` }}
          </span>
        </div>
      </div>
    </template>

    <!-- ── Rejected subject ───────────────────────────────────────────────── -->
    <template v-else-if="refType === 'subject' && subject">

      <!-- Subject info -->
      <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wide">Subject Details</p>
        </div>
        <div class="divide-y divide-gray-50">
          <div class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Name</span>
            <span class="text-sm font-medium text-gray-800">{{ subject.name || '—' }}</span>
          </div>
          <div v-if="subject.majors?.acronym" class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Major</span>
            <span class="text-sm font-medium text-gray-800">{{ subject.majors.acronym }}</span>
          </div>
          <div class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Year Level</span>
            <span class="text-sm font-medium text-gray-800">Year {{ subject.year_level }}</span>
          </div>
          <div v-if="subject.semester" class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Semester</span>
            <span class="text-sm font-medium text-gray-800">Semester {{ subject.semester }}</span>
          </div>
          <div v-if="subject.rejection_reason" class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Rejection Reason</span>
            <span class="text-sm font-medium text-red-600">{{ subject.rejection_reason }}</span>
          </div>
          <div class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Submitted</span>
            <span class="text-sm font-medium text-gray-800">{{ formatDate(subject.created_at) }}</span>
          </div>
          <div class="grid grid-cols-2 px-5 py-3">
            <span class="text-sm text-gray-400">Rejected</span>
            <span class="text-sm font-medium text-gray-800">{{ formatDate(subject.rejected_at) }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Fallback -->
    <div v-else class="text-sm text-gray-400 py-8 text-center">No details available.</div>
  </div>
</template>
