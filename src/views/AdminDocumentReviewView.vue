<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/axios'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const groupId = route.params.groupId as string

type Doc = {
  id: string
  group_id: string
  title: string
  doc_type: string
  file_size_kb: number
  file_url: string | null
  original_name: string | null
  status: string
  uploaded_at: string
  users: { id: string; first_name: string; last_name: string } | null
  majors: { id: string; acronym: string } | null
  subjects: { id: string; name: string } | null
}

const docs = ref<Doc[]>([])
const loading = ref(true)

const rejectModal = ref<{ id: string } | null>(null)
const rejectReason = ref('')
const rejecting = ref(false)

const uploader = computed(() => docs.value[0]?.users)
const major = computed(() => docs.value[0]?.majors)
const subject = computed(() => docs.value[0]?.subjects)

const pendingCount = computed(() => docs.value.filter((d) => d.status === 'pending').length)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get(`/admin/documents/group/${groupId}`)
    docs.value = data
  } finally {
    loading.value = false
  }
}

const actioning = ref<'approve' | 'reject' | null>(null)

async function approveAll() {
  actioning.value = 'approve'
  try {
    await api.patch(`/admin/documents/group/${groupId}/approve`)
    docs.value.forEach((d) => { if (d.status === 'pending') d.status = 'active' })
    router.push({ name: 'admin', query: { tab: 'approvals' } })
  } finally {
    actioning.value = null
  }
}

function openReject() {
  rejectModal.value = { id: groupId }
  rejectReason.value = ''
}

async function confirmReject() {
  if (!rejectModal.value) return
  rejecting.value = true
  try {
    const payload = rejectReason.value.trim() ? { reason: rejectReason.value.trim() } : {}
    await api.patch(`/admin/documents/group/${groupId}/reject`, payload)
    docs.value.forEach((d) => { if (d.status === 'pending') d.status = 'rejected' })
    rejectModal.value = null
    rejectReason.value = ''
    router.push({ name: 'admin', query: { tab: 'approvals' } })
  } finally {
    rejecting.value = false
  }
}

function formatSize(kb: number) {
  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const typeColor: Record<string, string> = {
  Note: 'bg-blue-100 text-blue-700',
  TD: 'bg-yellow-100 text-yellow-700',
  'Examination paper': 'bg-red-100 text-red-700',
  TP: 'bg-green-100 text-green-700',
  Project: 'bg-purple-100 text-purple-700',
  Lesson: 'bg-orange-100 text-orange-700',
  Thesis: 'bg-teal-100 text-teal-700',
  Other: 'bg-gray-100 text-gray-700',
}

const statusStyle: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-600',
}

onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-6 py-6 flex flex-col gap-6">

    <!-- Back -->
    <button @click="router.push({ name: 'admin', query: { tab: 'approvals' } })" class="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors w-fit">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Approvals
    </button>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-24">
      <LoadingSpinner />
    </div>

    <template v-else-if="docs.length">
      <!-- Header card -->
      <div class="bg-white rounded-2xl border border-gray-100 px-6 py-5 flex flex-col gap-1">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Upload Batch</p>
            <h1 class="text-xl font-bold text-gray-900">{{ docs.length }} file{{ docs.length > 1 ? 's' : '' }} submitted</h1>
            <p class="text-sm text-gray-500 mt-0.5">
              By <span class="font-medium text-gray-700">{{ uploader?.first_name }} {{ uploader?.last_name }}</span>
              <template v-if="major"> &bull; {{ major.acronym }}</template>
              <template v-if="subject"> &bull; {{ subject.name }}</template>
              &bull; {{ formatDate(docs[0]?.uploaded_at ?? '') }}
            </p>
          </div>
          <div v-if="pendingCount > 0" class="flex items-center gap-2">
            <button
              @click="approveAll"
              :disabled="actioning !== null"
              class="px-4 py-2 text-sm font-semibold bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              {{ actioning === 'approve' ? 'Approving…' : 'Approve' }}
            </button>
            <button
              @click="openReject"
              :disabled="actioning !== null"
              class="px-4 py-2 text-sm font-semibold bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-colors disabled:opacity-50"
            >
              Reject
            </button>
          </div>
          <span v-else class="text-sm font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">All actioned</span>
        </div>
      </div>

      <!-- Files list -->
      <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div
          v-for="(doc, i) in docs"
          :key="doc.id"
          :class="['px-6 py-4 flex items-center gap-4', i !== docs.length - 1 ? 'border-b border-gray-100' : '']"
        >
          <!-- File icon -->
          <div class="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ doc.title }}</p>
            <p class="text-xs text-gray-400 mt-0.5">
              <span :class="`font-medium px-1.5 py-0.5 rounded-full mr-1 ${typeColor[doc.doc_type] ?? 'bg-gray-100 text-gray-500'}`">
                {{ doc.doc_type }}
              </span>
              {{ doc.original_name }} &bull; {{ formatSize(doc.file_size_kb) }}
            </p>
          </div>

          <!-- Status badge -->
          <span :class="`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusStyle[doc.status] ?? 'bg-gray-100 text-gray-500'}`">
            {{ doc.status }}
          </span>

          <!-- Open file -->
          <a
            v-if="doc.file_url && doc.status !== 'rejected'"
            :href="doc.file_url"
            target="_blank"
            class="shrink-0 p-2 text-gray-400 hover:text-[#0057BD] hover:bg-blue-50 rounded-lg transition-colors"
            title="Open file"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

        </div>
      </div>
    </template>

    <div v-else class="text-center py-24 text-gray-400">No documents found for this batch.</div>
  </div>

  <!-- Reject modal -->
  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="rejectModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      @click.self="rejectModal = null"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-gray-900">Reject Document</h3>
          <button @click="rejectModal = null" class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-700">Reason <span class="text-gray-400 font-normal">(optional)</span></label>
          <textarea
            v-model="rejectReason"
            rows="3"
            placeholder="e.g. Duplicate content, missing information, inappropriate..."
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
          />
          <p class="text-xs text-gray-400">The uploader will see this in their dashboard and notification.</p>
        </div>
        <div class="flex gap-2 justify-end">
          <button @click="rejectModal = null" class="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            @click="confirmReject"
            :disabled="rejecting"
            class="px-4 py-2 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            {{ rejecting ? 'Rejecting…' : 'Confirm Reject' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
