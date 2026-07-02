<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDocumentsStore } from '@/stores/documents.store'
import { useSubjectsStore } from '@/stores/subjects.store'
import { useMajorsStore } from '@/stores/majors.store'
import { useAuthStore } from '@/stores/auth.store'
import { cefrLevel } from '@/utils/format'
import DocumentCard from '@/components/DocumentCard.vue'
import UploadDocumentModal from '@/components/UploadDocumentModal.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'
import FilterButton from '@/components/FilterButton.vue'
import ViewToggle from '@/components/ViewToggle.vue'

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const docs = useDocumentsStore()
const subjectsStore = useSubjectsStore()
const majorsStore = useMajorsStore()
const auth = useAuthStore()

const slug = route.params.slug as string
const year = Number(route.params.year)
// Absent for English/French (no subjects) — docs are listed by major + level.
const subjectId = (route.params.subjectId as string) || ''

const showUpload = ref(false)
const selectedType = ref('')
const viewMode = ref<'card' | 'list'>(
  (localStorage.getItem('docViewMode') as 'card' | 'list') ?? 'card',
)
watch(viewMode, (v) => localStorage.setItem('docViewMode', v))
const deleteEntry = ref<{ id: string; title: string } | null>(null)

async function confirmListDelete() {
  if (!deleteEntry.value) return
  await docs.deleteDocument(deleteEntry.value.id)
  deleteEntry.value = null
  await loadDocs()
}

// Match by lowercased acronym so every major works (incl. English/French).
const currentMajor = computed(() =>
  majorsStore.majors.find((m: any) => m.acronym?.toLowerCase() === slug),
)

const currentSubject = computed(() => subjectsStore.subjects.find((s: any) => s.id === subjectId))

// Backend already returns one upload per group with embedded documents[]
const groupedDocs = computed(() =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (docs.documents as any[]).map((upload) => ({
    doc: upload,
    count: (upload.documents?.length ?? 1) as number,
  })),
)

// Page title + level label
const levelLabel = computed(() => cefrLevel(slug, year) ?? t('common.documentsPage.year', { year }))

const breadcrumbItems = computed(() => {
  const items: { label: string; to?: object }[] = [
    { label: t('common.nav.home'), to: { name: 'home' } },
    {
      label: currentMajor.value?.acronym ?? slug.toUpperCase(),
      to: { name: 'department', params: { slug } },
    },
  ]
  if (subjectId) {
    items.push({ label: levelLabel.value, to: { name: 'subjects', params: { slug, year } } })
    items.push({ label: currentSubject.value?.name ?? t('common.documentsPage.subject') })
  } else {
    items.push({ label: levelLabel.value })
  }
  return items
})
const pageTitle = computed(
  () =>
    currentSubject.value?.name ??
    `${currentMajor.value?.acronym ?? slug.toUpperCase()} ${levelLabel.value}`,
)

// Documents are filtered by type in the DB. With a subject we filter by it;
// otherwise (English/French levels) we filter by major + level.
function loadDocs() {
  return docs.fetchAll({
    ...(subjectId
      ? { subject_id: subjectId }
      : { major_id: currentMajor.value?.id, year_level: year }),
    doc_type: selectedType.value || undefined,
  })
}

watch(selectedType, loadDocs)

const docTypes = computed(() => [
  { label: t('common.documentsPage.docTypeAll'), value: '' },
  { label: 'Note', value: 'Note' },
  { label: 'TD', value: 'TD' },
  { label: 'Examination paper', value: 'Examination paper' },
  { label: 'TP', value: 'TP' },
  { label: 'Project', value: 'Project' },
  { label: 'Lesson', value: 'Lesson' },
  { label: 'Thesis', value: 'Thesis' },
  { label: 'Other', value: 'Other' },
])

onMounted(async () => {
  if (!majorsStore.majors.length) await majorsStore.fetchMajors()

  // Load subjects so currentSubject name resolves
  if (currentMajor.value && !subjectsStore.subjects.length) {
    await subjectsStore.fetchByMajorAndYear(currentMajor.value.id, year)
  }

  // Fetch documents filtered by this subject
  await loadDocs()
})

async function onUploaded() {
  await loadDocs()
}
</script>

<template>
  <div>
    <div class="mx-auto w-full max-w-7xl px-6 flex flex-col gap-6">
      <!-- Breadcrumb -->
      <Breadcrumb :items="breadcrumbItems" />

      <!-- Header -->
      <div class="flex md:flex-row flex-col items-start md:items-center md:justify-between gap-4">
        <div class="flex flex-col w-full">
          <h1 class="text-3xl font-bold text-black capitalize">
            {{ pageTitle }}
          </h1>
          <p class="text-sm text-gray-400 mt-1">
            {{ t('common.documentsPage.documentsCount', groupedDocs.length) }}
          </p>
        </div>
        <div class="flex w-full md:items-center justify-between md:justify-end gap-3">
          <div class="w-40">
            <FilterButton
              v-model="selectedType"
              :placeholder="t('common.documentsPage.docTypeAll')"
              :options="docTypes"
            />
          </div>

          <ViewToggle v-model="viewMode" />

          <button
            @click="showUpload = true"
            class="flex items-center gap-2 bg-[#008CB9] hover:bg-[#00749b] text-white text-md px-4 py-2.5 rounded-xl transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            {{ t('common.documentsPage.upload') }}
          </button>
        </div>
      </div>

      <!-- Documents area -->
      <div>
        <!-- Loading -->
        <div v-if="docs.loading" class="flex justify-center py-20">
          <LoadingSpinner />
        </div>

        <!-- Empty -->
        <div
          v-else-if="groupedDocs.length === 0"
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

        <!-- Card grid -->
        <div v-else-if="viewMode === 'card'" class="flex justify-center items-center">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:w-full">
            <DocumentCard
              v-for="entry in groupedDocs"
              :key="entry.doc.id"
              :doc="entry.doc"
              :file-count="entry.count"
              @deleted="loadDocs()"
            />
          </div>
        </div>

        <!-- List view — desktop only -->
        <div v-else class="hidden md:block rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <!-- Table header -->
          <div class="hidden md:grid grid-cols-[2fr_120px_160px_100px_160px_110px_40px] gap-3 items-center border-b border-gray-100 px-4 py-3 text-sm font-medium text-black">
            <span>Name</span>
            <span>Academic year</span>
            <span>Tags</span>
            <span>File size</span>
            <span>Upload by</span>
            <span>Date</span>
            <span></span>
          </div>

          <!-- Rows -->
          <div
            v-for="(entry, idx) in groupedDocs"
            :key="entry.doc.id"
            class="grid grid-cols-1 md:grid-cols-[2fr_120px_160px_100px_160px_110px_40px] gap-3 items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
            :class="idx !== groupedDocs.length - 1 ? 'border-b border-gray-100' : ''"
            @click="$router.push({ name: 'document-details', query: { upload_id: entry.doc.id } })"
          >
            <!-- Name col: icon + title + type -->
            <div class="flex items-center gap-3 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="shrink-0 w-8 h-8">
                <path fill="#008CB9" d="M128 512L512 512C547.3 512 576 483.3 576 448L576 208C576 172.7 547.3 144 512 144L362.7 144C355.8 144 349 141.8 343.5 137.6L305.1 108.8C294 100.5 280.5 96 266.7 96L128 96C92.7 96 64 124.7 64 160L64 448C64 483.3 92.7 512 128 512z"/>
              </svg>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ entry.doc.title }}</p>
                <p class="text-xs text-[#008CB9] font-medium mt-0.5">{{ entry.doc.doc_type }}</p>
              </div>
            </div>

            <!-- Academic year -->
            <span class="text-sm text-gray-500">{{ entry.doc.academic_year || '—' }}</span>

            <!-- Tags -->
            <div class="flex items-center gap-1 flex-wrap">
              <span
                v-for="tag in (entry.doc.document_tags ?? [])"
                :key="tag.tag"
                class="text-xs px-2.5 py-0.5 rounded-full bg-[#B8EDFF] text-[#0082B8]"
              >{{ tag.tag }}</span>
              <span v-if="!(entry.doc.document_tags ?? []).length" class="text-sm text-gray-300">—</span>
            </div>

            <!-- File size -->
            <div class="text-sm text-gray-500">
              {{
                (() => {
                  const kb = (entry.doc.documents ?? []).reduce((s: number, f: any) => s + (f.file_size_kb ?? 0), 0)
                  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`
                })()
              }}
              <span class="block text-xs text-gray-400">{{ entry.count }} file{{ entry.count !== 1 ? 's' : '' }}</span>
            </div>

            <!-- Upload by -->
            <span class="text-sm text-gray-500">{{ entry.doc.users?.first_name }} {{ entry.doc.users?.last_name }}</span>

            <!-- Date -->
            <span class="text-sm text-gray-500">{{ new Date(entry.doc.uploaded_at).toLocaleDateString('en-GB') }}</span>

            <!-- Delete (owner only) -->
            <div class="flex justify-center" @click.stop>
              <button
                v-if="auth.user?.id === entry.doc.users?.id"
                @click="deleteEntry = { id: entry.doc.id, title: entry.doc.title }"
                class="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H9z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Delete confirm modal -->
        <Teleport to="body">
          <div
            v-if="deleteEntry"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
            @click.self="deleteEntry = null"
          >
            <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/10">
              <div class="text-center">
                <p class="text-lg font-semibold text-black">{{ t('common.DocumentCard.deleteTitle') }} {{ deleteEntry.title }}</p>
                <p class="mt-2 text-sm text-gray-500">{{ t('common.DocumentCard.deleteMessage') }}</p>
              </div>
              <div class="mt-6 grid grid-cols-2 gap-3">
                <button
                  class="rounded-xl border border-[#B0B0B0] bg-white px-4 py-2 text-sm text-black"
                  @click="deleteEntry = null"
                >{{ t('common.DocumentCard.deleteCancel') }}</button>
                <button
                  class="rounded-xl bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600"
                  @click="confirmListDelete"
                >{{ t('common.DocumentCard.deleteConfirm') }}</button>
              </div>
            </div>
          </div>
        </Teleport>
      </div>
    </div>

    <!-- Upload modal — pre-fills subject -->
    <UploadDocumentModal
      v-if="showUpload"
      :default-subject-id="subjectId"
      :default-major-id="currentMajor?.id"
      :default-year-level="year"
      @close="showUpload = false"
      @uploaded="onUploaded"
    />
  </div>
</template>
