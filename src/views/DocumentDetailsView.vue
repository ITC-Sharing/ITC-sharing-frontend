<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentsStore } from '@/stores/documents.store'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const docs = useDocumentsStore()

const subjectId = computed(() => String(route.query.subject_id ?? ''))
const groupId = computed(() => String(route.query.group_id ?? ''))

const pageTitle = computed(() => files.value[0]?.title || 'Document Details')

const files = computed(() => docs.documents)

const canLoad = computed(() => !!groupId.value)

const displayFileName = (doc: any) => doc.original_name?.trim() || doc.title || 'Untitled'

function getDownloadUrl(doc: any) {
  const downloadName = doc.original_name?.trim()
  return downloadName
    ? `${doc.file_url}?download=${encodeURIComponent(downloadName)}`
    : doc.file_url
}

async function downloadFile(doc: any) {
  await docs.trackDownload(doc.id)
  window.open(getDownloadUrl(doc), '_blank')
}

async function previewFile(doc: any) {
  window.open(doc.file_url, '_blank')
}

async function downloadAll() {
  for (const doc of files.value) {
    await downloadFile(doc)
  }
}

onMounted(async () => {
  if (!canLoad.value) return
  await docs.fetchAll({ subject_id: subjectId.value || undefined, group_id: groupId.value })
})
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-6 py-6">
    <div class="flex items-center gap-3 text-sm text-gray-400">
      <button class="hover:text-gray-600" @click="router.back()">Back</button>
    </div>

    <div class="mt-4 flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-3xl font-bold text-black">{{ pageTitle }}</h1>
        <p class="mt-1 text-sm text-gray-400">
          {{ files.length }} file{{ files.length !== 1 ? 's' : '' }}
        </p>
      </div>
      <button
        type="button"
        class="rounded-xl bg-[#1F69F5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1B58D1]"
        :disabled="!files.length"
        @click="downloadAll"
      >
        Download All
      </button>
    </div>

    <div v-if="docs.loading" class="flex justify-center py-16">
      <LoadingSpinner />
    </div>

    <div v-else-if="!canLoad" class="mt-8 text-sm text-gray-500">Missing group.</div>

    <div v-else-if="!files.length" class="mt-8 text-sm text-gray-500">No files found.</div>

    <div v-else class="mt-6 space-y-3">
      <div
        v-for="doc in files"
        :key="doc.id"
        class="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4"
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-black">
            {{ displayFileName(doc) }}
          </p>
          <p class="mt-1 text-xs text-gray-500">
            {{
              (doc.file_size_kb ?? 0) < 1024
                ? `${doc.file_size_kb} KB`
                : `${(doc.file_size_kb / 1024).toFixed(1)} MB`
            }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
            @click="previewFile(doc)"
          >
            Preview
          </button>
          <button
            type="button"
            class="rounded-lg bg-[#1F69F5] px-3 py-1 text-xs text-white hover:bg-[#1B58D1]"
            @click="downloadFile(doc)"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
