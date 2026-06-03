<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDocumentsStore } from '@/stores/documents.store'
import { useSubjectsStore } from '@/stores/subjects.store'
import { useMajorsStore } from '@/stores/majors.store'
import DocumentCard from '@/components/DocumentCard.vue'
import UploadDocumentModal from '@/components/UploadDocumentModal.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import Breadcrumb from '@/components/BreadCrumb.vue'
import FilterButton from '@/components/FilterButton.vue'

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const docs = useDocumentsStore()
const subjectsStore = useSubjectsStore()
const majorsStore = useMajorsStore()

const slug = route.params.slug as string
const year = Number(route.params.year)
const subjectId = route.params.subjectId as string

const showUpload = ref(false)
const selectedType = ref('')

const slugToAcronym: Record<string, string> = {
  gic: 'GIC',
  ams: 'AMS',
  gim: 'GIM',
  gtr: 'GTR',
  gca: 'GCA',
  gar: 'GAR',
  gru: 'GRU',
  gti: 'GTI',
  gee: 'GEE',
  foundation: 'Foundation',
}

const currentMajor = computed(() =>
  majorsStore.majors.find((m: any) => m.acronym === slugToAcronym[slug]),
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

const filteredDocs = computed(() => {
  if (!selectedType.value) return groupedDocs.value
  return groupedDocs.value.filter((entry) => entry.doc.doc_type === selectedType.value)
})

const docTypes = computed(() => [
  { label: t('common.documentsPage.docTypeAll'), value: '' },
  { label: t('common.documentsPage.docTypeNotes'), value: 'notes' },
  { label: t('common.documentsPage.docTypeAssignment'), value: 'assignment' },
  { label: t('common.documentsPage.docTypePastExam'), value: 'past_exam' },
  { label: t('common.documentsPage.docTypeLab'), value: 'lab' },
])

onMounted(async () => {
  if (!majorsStore.majors.length) await majorsStore.fetchMajors()

  // Load subjects so currentSubject name resolves
  if (currentMajor.value && !subjectsStore.subjects.length) {
    await subjectsStore.fetchByMajorAndYear(currentMajor.value.id, year)
  }

  // Fetch documents filtered by this subject
  await docs.fetchAll({ subject_id: subjectId })
})

async function onUploaded() {
  await docs.fetchAll({ subject_id: subjectId })
}
</script>

<template>
  <div>
    <div class="mx-auto w-full max-w-7xl px-6 py-6 flex flex-col gap-6">
      <!-- Breadcrumb -->
      <Breadcrumb
        :items="[
          { label: t('common.nav.home'), to: { name: 'home' } },
          {
            label: slugToAcronym[slug] ?? slug.toUpperCase(),
            to: { name: 'department', params: { slug } },
          },
          {
            label: t('common.documentsPage.year', { year }),
            to: { name: 'subjects', params: { slug, year } },
          },
          { label: currentSubject?.name ?? t('common.documentsPage.subject') },
        ]"
      />

      <!-- Header -->
      <div class="flex md:flex-row flex-col items-start md:items-center md:justify-between gap-4">
        <div class="flex flex-col w-full">
          <h1 class="text-3xl font-bold text-black capitalize">
            {{ currentSubject?.name ?? 'Documents' }}
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

      <!-- Scrollable documents area -->
      <div class="overflow-y-auto max-h-[calc(100vh-290px)]">
        <!-- Loading -->
        <div v-if="docs.loading" class="flex justify-center py-20">
          <LoadingSpinner />
        </div>

        <!-- Empty -->
        <div
          v-else-if="filteredDocs.length === 0"
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

        <!-- Document grid -->
        <div v-else class="flex justify-center md:justify-start items-center">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            <DocumentCard
              v-for="entry in filteredDocs"
              :key="entry.doc.id"
              :doc="entry.doc"
              :file-count="entry.count"
              @deleted="docs.fetchAll({ subject_id: subjectId })"
            />
          </div>
        </div>
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
