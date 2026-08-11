<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDocumentsStore } from '@/stores/documents.store'
import { useAuthStore } from '@/stores/auth.store'
import DocumentCard from '@/components/documents/DocumentCard.vue'
import DocumentListRow from '@/components/documents/DocumentListRow.vue'
import ViewToggle from '@/components/common/ViewToggle.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import UploadAndEditDocModal from '@/components/dashboard/UploadAndEditDocModal.vue'
import IconTextButton from '@/components/common/IconTextButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import PageSizeSelect from '@/components/common/PageSizeSelect.vue'
import SearchButton from '@/components/common/SearchButton.vue'
import FilterButton from '@/components/common/FilterButton.vue'

const { t } = useI18n({ useScope: 'global' })
const docs = useDocumentsStore()
const auth = useAuthStore()
const showUpload = ref(false)

// Card vs list, persisted (shared key with DocumentsView so the choice carries).
const viewMode = ref<'card' | 'list'>(
  (localStorage.getItem('docViewMode') as 'card' | 'list') ?? 'card',
)
watch(viewMode, (v) => localStorage.setItem('docViewMode', v))

const page = ref(1)
const pageSize = ref(10)
const searchQuery = ref('')
const selectedType = ref('')

const docTypes = [
  { label: 'All', value: '' },
  { label: 'Note', value: 'Note' },
  { label: 'TD', value: 'TD' },
  { label: 'Exam Preparation', value: 'Exam Preparation' },
  { label: 'TP', value: 'TP' },
  { label: 'Project', value: 'Project' },
  { label: 'Lesson', value: 'Lesson' },
  { label: 'Thesis', value: 'Thesis' },
  { label: 'Other', value: 'Other' },
]

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
    doc_type: selectedType.value || undefined,
    search: searchQuery.value || undefined,
    page: page.value,
    limit: pageSize.value,
  })
}

// Reload this view's own feed. Previously refetched by uploader_id, which
// replaced the major/year feed with just the current user's uploads.
async function onUploaded() {
  await Promise.all([load(), docs.fetchMine()])
}

// Fire once now and again whenever the user (major/year) loads in or the page changes
watch([majorId, yearLevel, page], load, { immediate: true })

// A filter/search/size change narrows the result set, so go back to page 1.
// The page watcher then reloads, unless we're already on page 1 → load directly.
function resetAndLoad() {
  if (page.value === 1) load()
  else page.value = 1
}

watch([selectedType, pageSize], resetAndLoad)

// Debounce search to avoid a request on every keystroke.
let searchTimer: ReturnType<typeof setTimeout>
watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(resetAndLoad, 300)
})
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
        <div class="flex w-full md:w-auto flex-wrap items-center gap-3">
          <!-- Fixed width so the search doesn't grow and force the row to wrap. -->
          <div class="w-full sm:w-64">
            <SearchButton v-model="searchQuery" :placeholder="t('common.nav.search')" />
          </div>
          <div class="w-40 shrink-0">
            <FilterButton v-model="selectedType" placeholder="All" :options="docTypes" />
          </div>
          <ViewToggle v-model="viewMode" />
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
          <!-- Card grid -->
          <div
            v-if="viewMode === 'card'"
            class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          >
            <DocumentCard
              v-for="doc in docs.documents"
              :key="doc.id"
              :doc="doc"
              :file-count="doc.documents?.length ?? 1"
              @deleted="load"
            />
          </div>

          <!-- List view — desktop only; mobile falls back to cards below -->
          <div
            v-else
            class="hidden md:block rounded-2xl border border-gray-200 bg-white overflow-hidden"
          >
            <!-- Table header -->
            <div
              class="hidden md:grid grid-cols-[2fr_120px_100px_160px_110px_40px] gap-3 items-center border-b border-gray-100 px-4 py-3 text-sm font-medium text-black"
            >
              <span>{{ t('document.documentsPage.colName') }}</span>
              <span>{{ t('document.documentsPage.colAcademicYear') }}</span>
              <span>{{ t('document.documentsPage.colFileSize') }}</span>
              <span>{{ t('document.documentsPage.colUploadBy') }}</span>
              <span>{{ t('document.documentsPage.colDate') }}</span>
              <span></span>
            </div>

            <!-- Rows -->
            <div class="divide-y divide-gray-100">
              <DocumentListRow
                v-for="doc in docs.documents"
                :key="doc.id"
                :doc="doc"
                :file-count="doc.documents?.length ?? 1"
                @deleted="load"
              />
            </div>
          </div>

          <!-- Mobile fallback: list view is desktop-only, so show cards on small screens -->
          <div
            v-if="viewMode === 'list'"
            class="grid grid-cols-1 gap-5 sm:grid-cols-2 md:hidden"
          >
            <DocumentCard
              v-for="doc in docs.documents"
              :key="doc.id"
              :doc="doc"
              :file-count="doc.documents?.length ?? 1"
              @deleted="load"
            />
          </div>
        </div>

        <!-- Footer: pager centered, page size on the same row at the right.
             Hidden entirely when the whole list fits in the smallest page size
             (≤10) — there's nothing to paginate and no size worth choosing. -->
        <div
          v-if="docs.total > 10"
          class="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4"
        >
          <Pagination
            class="col-start-2 justify-self-center"
            v-model:page="page"
            :total="docs.total"
            :page-size="pageSize"
            scroll-to-top
          />
          <PageSizeSelect
            class="col-start-3 justify-self-end"
            v-model="pageSize"
            :options="[10, 20, 30, 50]"
            direction="up"
          />
        </div>
      </template>
    </div>
    <UploadAndEditDocModal v-if="showUpload" @close="showUpload = false" @uploaded="onUploaded" />
  </div>
</template>
