<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDocumentsStore } from '@/stores/documents.store'
import { useSubjectsStore } from '@/stores/subjects.store'
import { useMajorsStore } from '@/stores/majors.store'
import DocumentCard from '@/components/DocumentCard.vue'
import UploadDocumentModal from '@/components/UploadDocumentModal.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import Breadcrumb from '@/components/Breadcrumb.vue'

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

const groupedDocs = computed(() => {
  const map = new Map<string, { doc: any; count: number; docs: any[] }>()
  for (const doc of docs.documents as any[]) {
    const key = doc.group_id ?? doc.id
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { doc, count: 1, docs: [doc] })
      continue
    }
    existing.count += 1
    existing.docs.push(doc)
    if (new Date(doc.uploaded_at).getTime() > new Date(existing.doc.uploaded_at).getTime()) {
      existing.doc = doc
    }
  }
  return Array.from(map.values())
})

// Filter grouped docs by type client-side
const filteredDocs = computed(() => {
  if (!selectedType.value) return groupedDocs.value
  return groupedDocs.value.filter((entry) =>
    entry.docs.some((d) => d.doc_type === selectedType.value),
  )
})

const docTypes = [
  { label: 'All', value: '' },
  { label: 'Notes', value: 'notes' },
  { label: 'Assignment', value: 'assignment' },
  { label: 'Past Exam', value: 'past_exam' },
  { label: 'Lab', value: 'lab' },
]

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
          { label: 'Home', to: { name: 'home' } },
          { label: slugToAcronym[slug] ?? slug.toUpperCase(), to: { name: 'department', params: { slug } } },
          { label: `Year ${year}`, to: { name: 'subjects', params: { slug, year } } },
          { label: currentSubject?.name ?? 'Subject' },
        ]"
      />

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-3xl font-bold text-black">{{ currentSubject?.name ?? 'Documents' }}</h1>
          <p class="text-sm text-gray-400 mt-1">
            {{ groupedDocs.length }} document{{ groupedDocs.length !== 1 ? 's' : '' }}
          </p>
        </div>
        <button
          @click="showUpload = true"
          class="flex items-center gap-2 bg-[#008CB9] hover:bg-[#00749b] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
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
          Upload
        </button>
      </div>

      <!-- Type filter tabs -->
      <div class="flex gap-1 border-b border-gray-200">
        <button
          v-for="type in docTypes"
          :key="type.value"
          @click="selectedType = type.value"
          :class="[
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            selectedType === type.value
              ? 'border-[#0057BD] text-[#0057BD]'
              : 'border-transparent text-gray-400 hover:text-gray-600',
          ]"
        >
          {{ type.label }}
          <span class="ml-1 text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
            {{
              type.value
                ? groupedDocs.filter((entry) => entry.docs.some((d) => d.doc_type === type.value))
                    .length
                : groupedDocs.length
            }}
          </span>
        </button>
      </div>

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
        <p class="text-gray-400 font-medium">No documents yet</p>
        <button @click="showUpload = true" class="text-[#0057BD] text-sm underline">
          Upload the first one
        </button>
      </div>

      <!-- Document grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        <DocumentCard
          v-for="entry in filteredDocs"
          :key="entry.doc.id"
          :doc="entry.doc"
          :file-count="entry.count"
          @deleted="docs.fetchAll({ subject_id: subjectId })"
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
