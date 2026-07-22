<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDocumentsStore } from '@/stores/documents.store'
import { useSubjectsStore } from '@/stores/subjects.store'
import { useMajorsStore } from '@/stores/majors.store'
import { cefrLevel } from '@/utils/format'
import DocumentCard from '@/components/documents/DocumentCard.vue'
import DocumentListRow from '@/components/documents/DocumentListRow.vue'
import UploadDocumentModal from '@/components/documents/UploadDocumentModal.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import FilterButton from '@/components/common/FilterButton.vue'
import ViewToggle from '@/components/common/ViewToggle.vue'
import IconTextButton from '@/components/common/IconTextButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const docs = useDocumentsStore()
const subjectsStore = useSubjectsStore()
const majorsStore = useMajorsStore()

const slug = route.params.slug as string
const year = Number(route.params.year)
// Absent for English/French (no subjects) — docs are listed by major + level.
const subjectId = (route.params.subjectId as string) || ''

const showUpload = ref(false)
const selectedType = ref('')

const PAGE_SIZE = 24
const page = ref(1)
const viewMode = ref<'card' | 'list'>(
  (localStorage.getItem('docViewMode') as 'card' | 'list') ?? 'card',
)
watch(viewMode, (v) => localStorage.setItem('docViewMode', v))

// Match by lowercased acronym so every major works (incl. English/French).
const currentMajor = computed(() =>
  majorsStore.majors.find((m) => m.acronym?.toLowerCase() === slug),
)

const currentSubject = computed(() => subjectsStore.subjects.find((s) => s.id === subjectId))

// Backend already returns one upload per group with embedded documents[]
const groupedDocs = computed(() =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (docs.documents as any[]).map((upload) => ({
    doc: upload,
    count: (upload.documents?.length ?? 1) as number,
  })),
)

// Page title + level label
const levelLabel = computed(() => cefrLevel(slug, year) ?? t('document.documentsPage.year', { year }))

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
    items.push({ label: currentSubject.value?.name ?? t('document.documentsPage.subject') })
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
    page: page.value,
    limit: PAGE_SIZE,
  })
}

// Changing the filter re-narrows the result set, so page 3 of the old results
// is meaningless — go back to page 1. The watcher on `page` then refetches,
// unless we were already on page 1, in which case fetch directly.
watch(selectedType, () => {
  if (page.value === 1) loadDocs()
  else page.value = 1
})

watch(page, loadDocs)

const docTypes = [
  { label: 'All', value: '' },
  { label: 'Note', value: 'Note' },
  { label: 'TD', value: 'TD' },
  { label: 'Examination paper', value: 'Examination paper' },
  { label: 'TP', value: 'TP' },
  { label: 'Project', value: 'Project' },
  { label: 'Lesson', value: 'Lesson' },
  { label: 'Thesis', value: 'Thesis' },
  { label: 'Other', value: 'Other' },
]

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
            <!-- docs.total is every match, not just this page's slice. -->
            {{ t('document.documentsPage.documentsCount', docs.total) }}
          </p>
        </div>
        <div class="flex w-full md:items-center justify-between md:justify-end gap-3">
          <div class="w-40">
            <FilterButton v-model="selectedType" placeholder="All" :options="docTypes" />
          </div>

          <ViewToggle v-model="viewMode" />

          <IconTextButton :text="t('document.documentsPage.upload')" @click="showUpload = true">
            <template #icon>
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
            </template>
          </IconTextButton>
        </div>
      </div>

      <!-- Documents area -->
      <div>
        <!-- Loading -->
        <div v-if="docs.loading" class="flex justify-center py-20">
          <LoadingSpinner />
        </div>

        <!-- Empty -->
        <EmptyState
          v-else-if="groupedDocs.length === 0"
          :message="t('document.documentsPage.noDocuments')"
          :action-label="t('document.documentsPage.uploadFirst')"
          @action="showUpload = true"
        />

        <!-- Card grid -->
        <div v-else-if="viewMode === 'card'">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
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
        <div
          v-else
          class="hidden md:block rounded-2xl border border-gray-200 bg-white overflow-hidden"
        >
          <!-- Table header -->
          <div
            class="hidden md:grid grid-cols-[2fr_120px_160px_100px_160px_110px_40px] gap-3 items-center border-b border-gray-100 px-4 py-3 text-sm font-medium text-black"
          >
            <span>{{ t('document.documentsPage.colName') }}</span>
            <span>{{ t('document.documentsPage.colAcademicYear') }}</span>
            <span>{{ t('document.documentsPage.colTags') }}</span>
            <span>{{ t('document.documentsPage.colFileSize') }}</span>
            <span>{{ t('document.documentsPage.colUploadBy') }}</span>
            <span>{{ t('document.documentsPage.colDate') }}</span>
            <span></span>
          </div>

          <!-- Rows -->
          <div class="divide-y divide-gray-100">
            <DocumentListRow
              v-for="entry in groupedDocs"
              :key="entry.doc.id"
              :doc="entry.doc"
              :file-count="entry.count"
              @deleted="loadDocs()"
            />
          </div>
        </div>

        <Pagination
          v-model:page="page"
          :total="docs.total"
          :page-size="PAGE_SIZE"
          scroll-to-top
        />
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
