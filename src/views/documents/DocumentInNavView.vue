<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDocumentsStore } from '@/stores/documents.store'
import { useAuthStore } from '@/stores/auth.store'
import DocumentCard from '@/components/documents/DocumentCard.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import UploadDocumentDashboard from '@/components/dashboard/UploadDocumentDashboard.vue'
import IconTextButton from '@/components/common/IconTextButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'

const { t } = useI18n({ useScope: 'global' })
const docs = useDocumentsStore()
const auth = useAuthStore()
const showUpload = ref(false)

const PAGE_SIZE = 10
const page = ref(1)

// Supabase can return the embedded relation as an object or a single-item array
const userMajor = computed(() => {
  const m = auth.user?.majors as
    | { id: string; acronym: string }
    | { id: string; acronym: string }[]
    | undefined
  return Array.isArray(m) ? m[0] : m
})
const majorId = computed(() => userMajor.value?.id)
const yearLevel = computed(() => auth.user?.year_level)

function load() {
  if (!majorId.value || !yearLevel.value) return
  docs.fetchAll({
    major_id: majorId.value,
    year_level: yearLevel.value,
    page: page.value,
    limit: PAGE_SIZE,
  })
}

// Reload this view's own feed. Previously refetched by uploader_id, which
// replaced the major/year feed with just the current user's uploads.
async function onUploaded() {
  await Promise.all([load(), docs.fetchMine()])
}

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
              t('document.documentsPage.subtitle', {
                major: userMajor?.acronym ?? '—',
                year: yearLevel ?? '—',
              })
            }}
          </p>
        </div>
        <IconTextButton :text="t('dashboard.documents.upload')" @click="showUpload = true">
          <template #icon>
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </template>
        </IconTextButton>
      </div>

      <!-- Loading -->
      <div v-if="docs.loading" class="flex justify-center py-20"><LoadingSpinner /></div>

      <!-- Error -->
      <div v-else-if="docs.error" class="py-8 text-center text-sm text-red-500">
        {{ docs.error }}
      </div>

      <!-- Empty -->
      <EmptyState
        v-else-if="docs.documents.length === 0"
        :message="t('document.documentsPage.noDocuments')"
        :action-label="t('document.documentsPage.uploadFirst')"
        @action="showUpload = true"
      />
      <!-- Grid -->
      <template v-else>
        <div class="mb-4">
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <DocumentCard
              v-for="doc in docs.documents"
              :key="doc.id"
              :doc="doc"
              :file-count="doc.documents?.length ?? 1"
              @deleted="load"
            />
          </div>
        </div>

        <Pagination
          v-model:page="page"
          :total="docs.total"
          :page-size="PAGE_SIZE"
          scroll-to-top
        />
      </template>
    </div>
    <UploadDocumentDashboard v-if="showUpload" @close="showUpload = false" @uploaded="onUploaded" />
  </div>
</template>
