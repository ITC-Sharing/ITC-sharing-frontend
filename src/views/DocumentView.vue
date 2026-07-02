<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDocumentsStore } from '@/stores/documents.store'
import { useAuthStore } from '@/stores/auth.store'
import DocumentCard from '@/components/DocumentCard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import UploadDocumentDashboard from '@/components/UploadDocumentDashboard.vue'
import AddButton from '@/components/AddButton.vue'

const { t } = useI18n({ useScope: 'global' })
const docs = useDocumentsStore()
const auth = useAuthStore()
const showUpload = ref(false)

const PAGE_SIZE = 10
const page = ref(1)

// Supabase can return the embedded relation as an object or a single-item array
const userMajor = computed(() => {
  const m = auth.user?.majors as { id: string; acronym: string } | { id: string; acronym: string }[] | undefined
  return Array.isArray(m) ? m[0] : m
})
const majorId = computed(() => userMajor.value?.id)
const yearLevel = computed(() => auth.user?.year_level)
const totalPages = computed(() => Math.max(1, Math.ceil(docs.total / PAGE_SIZE)))
const selectedType = ref('')
const searchQuery = ref('')

function load() {
  if (!majorId.value || !yearLevel.value) return
  docs.fetchAll({
    major_id: majorId.value,
    year_level: yearLevel.value,
    page: page.value,
    limit: PAGE_SIZE,
  })
}

function loadDocs() {
  return docs.fetchAll({
    uploader_id: auth.user?.id,
    doc_type: selectedType.value || undefined,
    search: searchQuery.value.trim() || undefined,
  })
}

function goTo(p: number | '…') {
  if (p === '…' || p < 1 || p > totalPages.value || p === page.value) return
  page.value = p
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function onUploaded() {
  await Promise.all([loadDocs(), docs.fetchMine()])
}

// Windowed page numbers (1 … 4 5 6 … 12)
const visiblePages = computed<(number | '…')[]>(() => {
  const tp = totalPages.value
  const cur = page.value
  if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  const start = Math.max(2, cur - 1)
  const end = Math.min(tp - 1, cur + 1)
  if (start > 2) pages.push('…')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < tp - 1) pages.push('…')
  pages.push(tp)
  return pages
})

// Fire once now and again whenever the user (major/year) loads in or the page changes
watch([majorId, yearLevel, page], load, { immediate: true })
</script>

<template>
  <div class="w-full">
    <div class="mx-auto w-full max-w-7xl px-6">
      <!-- Header -->
      <div class="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{{ t('common.nav.docs') }}</h1>
          <p class="mt-1 text-sm text-gray-400">
            {{
              t('common.documentsPage.subtitle', {
                major: userMajor?.acronym ?? '—',
                year: yearLevel ?? '—',
              })
            }}
          </p>
        </div>
        <AddButton :label="t('dashboard.documents.upload')" @click="showUpload = true" />
      </div>

      <!-- Loading -->
      <div v-if="docs.loading" class="flex justify-center py-20"><LoadingSpinner /></div>

      <!-- Error -->
      <div v-else-if="docs.error" class="py-8 text-center text-sm text-red-500">
        {{ docs.error }}
      </div>

      <!-- Empty -->
      <div
        v-else-if="docs.documents.length === 0"
        class="flex flex-col items-center py-24 gap-3 text-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-14 w-14 text-gray-200"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p class="text-gray-400 font-medium">{{ t('common.documentsPage.noDocuments') }}</p>
        <button @click="showUpload = true" class="text-[#0057BD] text-sm underline">
          {{ t('common.documentsPage.uploadFirst') }}
        </button>
      </div>
      <!-- Grid -->
      <template v-else>
        <div class="flex items-center justify-center md:justify-between mb-4 gap-3 flex-wrap">
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <DocumentCard
            v-for="doc in docs.documents"
            :key="doc.id"
            :doc="doc"
            :file-count="doc.documents?.length ?? 1"
            @deleted="load"
          />
        </div>
        </div>
        

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="mt-8 flex items-center justify-center gap-1">
          <button
            :disabled="page === 1"
            @click="goTo(page - 1)"
            class="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {{ t('common.documentsPage.prev') }}
          </button>

          <button
            v-for="(p, i) in visiblePages"
            :key="i"
            :disabled="p === '…'"
            @click="goTo(p)"
            :class="[
              'min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors',
              p === page
                ? 'bg-[#008CB9] text-white'
                : p === '…'
                  ? 'text-gray-400 cursor-default'
                  : 'text-gray-600 hover:bg-gray-100',
            ]"
          >
            {{ p }}
          </button>

          <button
            :disabled="page === totalPages"
            @click="goTo(page + 1)"
            class="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {{ t('common.documentsPage.next') }}
          </button>
        </div>
      </template>
    </div>
    <UploadDocumentDashboard v-if="showUpload" @close="showUpload = false" @uploaded="onUploaded" />
  </div>
</template>
