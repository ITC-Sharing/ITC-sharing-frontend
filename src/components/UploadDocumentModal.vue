<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useDocumentsStore } from '@/stores/documents.store'
import { useMajorsStore } from '@/stores/majors.store'
import { useSubjectsStore } from '@/stores/subjects.store'
import { useI18n } from 'vue-i18n'
import SelectDropdown from '@/components/SelectDropdown.vue'

const auth = useAuthStore()
const docs = useDocumentsStore()
const majors = useMajorsStore()
const subjects = useSubjectsStore()
const { t } = useI18n({ useScope: 'global' })

const emit = defineEmits<{ (e: 'close'): void; (e: 'uploaded'): void }>()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const isDragActive = ref(false)
const tagInput = ref('')
const props = defineProps<{
  defaultSubjectId?: string
  defaultMajorId?: string
  defaultYearLevel?: number | string
}>()

const form = reactive({
  title: '',
  doc_type: '',
  year_level: props.defaultYearLevel
    ? String(props.defaultYearLevel)
    : auth.user?.year_level
      ? String(auth.user.year_level)
      : '',
  academic_year: '',
  major_id: props.defaultMajorId ?? auth.user?.majors?.id ?? '',
  subject_id: props.defaultSubjectId ?? '',
  tags: [] as string[],
})

const lockedMajorId = computed(() => props.defaultMajorId ?? auth.user?.majors?.id ?? '')
const lockedSubjectId = computed(() => props.defaultSubjectId ?? '')
const lockedYearLevel = computed(() =>
  props.defaultYearLevel
    ? String(props.defaultYearLevel)
    : auth.user?.year_level
      ? String(auth.user.year_level)
      : '',
)
const lockMajorAndSubject = true
const lockYearLevel = true

const errors = reactive({
  title: '',
  doc_type: '',
  year_level: '',
  academic_year: '',
  major_id: '',
  file: '',
})

// Load subjects when major changes
watch(
  () => form.major_id,
  async (id) => {
    form.subject_id = ''
    if (id) await subjects.fetchByMajorAndYear(id, 0)
  },
)

watch(
  lockedMajorId,
  (id) => {
    if (id && form.major_id !== id) form.major_id = id
  },
  { immediate: true },
)

watch(
  lockedSubjectId,
  (id) => {
    if (form.subject_id !== id) form.subject_id = id
  },
  { immediate: true },
)

watch(
  lockedYearLevel,
  (value) => {
    if (value && form.year_level !== value) form.year_level = value
  },
  { immediate: true },
)

// Format a raw doc_type value into a human-readable label
function formatDocTypeLabel(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const docTypeOptions = computed(() =>
  docs.docTypes.map((type) => ({ value: type, label: formatDocTypeLabel(type) })),
)

const majorOptions = computed(() =>
  majors.majors.map((m) => ({ value: m.id, label: m.acronym })),
)

const subjectOptions = computed(() =>
  subjects.subjects.map((s) => ({ value: s.id, label: s.name })),
)

// Initialise
docs.fetchDocTypes()
majors.fetchMajors()
if (form.major_id) subjects.fetchByMajorAndYear(form.major_id, 0)

function onFileChange(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (!files.length) return
  selectedFiles.value = files
  errors.file = ''
  const firstFile = files[0]
  if (files.length === 1 && firstFile && !form.title) {
    form.title = firstFile.name.replace(/\.[^.]+$/, '')
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragActive.value = true
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault()
  isDragActive.value = false
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragActive.value = false
  const files = Array.from(event.dataTransfer?.files ?? [])
  if (!files.length) return
  selectedFiles.value = files
  errors.file = ''
  const firstFile = files[0]
  if (files.length === 1 && firstFile && !form.title) {
    form.title = firstFile.name.replace(/\.[^.]+$/, '')
  }
}

function addTag() {
  const tag = tagInput.value.trim().toLowerCase()
  if (tag && !form.tags.includes(tag) && form.tags.length < 3) {
    form.tags.push(tag)
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  form.tags = form.tags.filter((t) => t !== tag)
}

function validate() {
  const needsTitle = selectedFiles.value.length <= 1
  errors.title = needsTitle && !form.title ? t('common.documentUploadModal.errorTitleRequired') : ''
  errors.doc_type = form.doc_type ? '' : t('common.documentUploadModal.errorSelectType')
  errors.year_level = form.year_level ? '' : t('common.documentUploadModal.errorSelectYear')
  errors.academic_year = validateAcademicYear(form.academic_year)
  errors.major_id = form.major_id ? '' : t('common.documentUploadModal.errorSelectMajor')
  errors.file = selectedFiles.value.length ? '' : t('common.documentUploadModal.errorSelectFile')
  return !Object.values(errors).some(Boolean)
}

function validateAcademicYear(value: string): string {
  if (!value) return t('common.documentUploadModal.errorAcademicYearRequired')
  const match = value.match(/^(\d{4})-(\d{4})$/)
  if (!match) return t('common.documentUploadModal.errorAcademicYearFormat')
  const start = parseInt(match[1])
  const end = parseInt(match[2])
  if (end !== start + 1) return t('common.documentUploadModal.errorAcademicYearEnd', { year: start + 1 })
  return ''
}

async function submit() {
  if (!validate()) return

  const formData = new FormData()
  selectedFiles.value.forEach((file) => {
    formData.append('files', file)
  })
  formData.append('title', form.title)
  formData.append('doc_type', form.doc_type)
  if (form.year_level) formData.append('year_level', form.year_level)
  if (form.academic_year) formData.append('academic_year', form.academic_year)
  formData.append('major_id', form.major_id)
  if (form.subject_id) formData.append('subject_id', form.subject_id)
  form.tags.forEach((tag) => formData.append('tags[]', tag))

  try {
    await docs.upload(formData)
    emit('uploaded')
    emit('close')
  } catch {
    // docs.error is set by store
  }
}
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div class="flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 md:max-w-md">
      <!-- Header -->
      <div class="border-b border-black/5 px-5 py-4">
        <p class="text-center text-xl font-bold text-black">
          {{ t('common.documentUploadModal.docUpload') }}
        </p>
      </div>

      <!-- Scrollable form body -->
      <div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">

        <!-- Server error -->
        <p v-if="docs.error" class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {{ docs.error }}
        </p>

        <!-- File drop zone -->
        <div class="space-y-1">
          <label
            class="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-4 text-center transition"
            :class="isDragActive ? 'border-[#0057BD] bg-[#F3F8FF]' : 'border-[#D3D3D3] bg-[#FAFAFA] hover:border-[#0057BD] hover:bg-[#F3F8FF]'"
            @click.prevent="fileInput?.click()"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
          >
            <input
              ref="fileInput"
              type="file"
              class="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
              multiple
              @change="onFileChange"
            />
            <div v-if="selectedFiles.length" class="text-sm font-medium text-gray-700">
              <p class="mb-2">{{ t('common.documentUploadModal.filesSelected', { count: selectedFiles.length }) }}</p>
              <ul class="max-h-20 space-y-1 overflow-y-auto text-xs text-gray-500">
                <li v-for="file in selectedFiles" :key="file.name + file.size">
                  {{ file.name }} ({{ (file.size / 1024).toFixed(0) }} KB)
                </li>
              </ul>
            </div>
            <template v-else>
              <div class="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#E8EEF8] text-[#8A8A8A]">
                <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="1.7">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke-linecap="round" stroke-linejoin="round" />
                  <polyline points="14 2 14 8 20 8" stroke-linecap="round" stroke-linejoin="round" />
                  <line x1="12" y1="18" x2="12" y2="12" stroke-linecap="round" />
                  <line x1="9" y1="15" x2="15" y2="15" stroke-linecap="round" />
                </svg>
              </div>
              <p class="text-sm font-medium text-gray-500">{{ t('common.documentUploadModal.selectFile') }}</p>
              <p class="mt-1 text-xs text-gray-400">{{ t('common.documentUploadModal.fileTypes') }}</p>
            </template>
          </label>
          <p v-if="errors.file" class="text-sm text-red-600">{{ errors.file }}</p>
        </div>

        <!-- Title -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-black">
            {{ t('common.documentUploadModal.title') }} <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.title"
            type="text"
            :placeholder="t('common.documentUploadModal.titlePlaceholder')"
            class="w-full rounded-xl border border-[#D9D9D9] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#0057BD]"
            :class="errors.title ? 'border-red-400' : ''"
            @blur="errors.title = selectedFiles.length <= 1 && !form.title ? t('common.documentUploadModal.errorTitleRequired') : ''"
            @input="errors.title = form.title ? '' : errors.title"
          />
          <p v-if="errors.title" class="text-sm text-red-600">{{ errors.title }}</p>
        </div>

        <!-- Type + Academic Year -->
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-2">
            <label class="text-sm font-medium text-black">
              {{ t('common.documentUploadModal.typeLabel') }} <span class="text-red-500">*</span>
            </label>
            <SelectDropdown
              v-model="form.doc_type"
              :placeholder="t('common.documentUploadModal.selectTypePlaceholder')"
              :options="docTypeOptions"
              @change="errors.doc_type = form.doc_type ? '' : t('common.documentUploadModal.errorSelectType')"
            />
            <p v-if="errors.doc_type" class="text-sm text-red-600">{{ errors.doc_type }}</p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-black">
              {{ t('common.documentUploadModal.academicYearLabel') }} <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              v-model="form.academic_year"
              :placeholder="t('common.documentUploadModal.academicYearPlaceholder')"
              maxlength="9"
              @blur="errors.academic_year = validateAcademicYear(form.academic_year)"
              class="w-full rounded-xl border border-[#D9D9D9] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#0057BD]"
              :class="errors.academic_year ? 'border-red-400' : ''"
            />
            <p v-if="errors.academic_year" class="text-sm text-red-600">{{ errors.academic_year }}</p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-black">
              {{ t('common.documentUploadModal.majorLabel') }} <span class="text-red-500">*</span>
            </label>
            <SelectDropdown
              v-model="form.major_id"
              :placeholder="t('common.documentUploadModal.selectMajorPlaceholder')"
              :options="majorOptions"
              :disabled="lockMajorAndSubject"
            />
            <p v-if="errors.major_id" class="text-sm text-red-600">{{ errors.major_id }}</p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-black">
              {{ t('common.documentUploadModal.yearLevelLabel') }} <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              v-model="form.year_level"
              :disabled="lockYearLevel"
              :placeholder="t('common.documentUploadModal.yearLevelPlaceholder')"
              class="w-full rounded-xl border border-[#D9D9D9] bg-[#F5F5F5] px-4 py-2.5 text-sm text-gray-600 outline-none"
            />
            <p v-if="errors.year_level" class="text-sm text-red-600">{{ errors.year_level }}</p>
          </div>
        </div>

        <!-- Subject -->
        <div v-if="form.major_id" class="space-y-2">
          <label class="text-sm font-medium text-black">{{ t('common.documentUploadModal.subjectLabel') }}</label>
          <SelectDropdown
            v-model="form.subject_id"
            :placeholder="t('common.documentUploadModal.selectSubjectPlaceholder')"
            :options="subjectOptions"
            :disabled="lockMajorAndSubject"
          />
        </div>

        <!-- Tags -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-black">
            {{ t('common.documentUploadModal.tagsLabel') }}
            <span class="font-normal text-gray-400">{{ t('common.documentUploadModal.tagsOptional') }}</span>
          </label>
          <div class="flex gap-2">
            <input
              v-model="tagInput"
              @keydown.enter.prevent="addTag"
              type="text"
              :placeholder="t('common.documentUploadModal.tagPlaceholder')"
              class="flex-1 rounded-xl border border-[#D9D9D9] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#0057BD]"
            />
            <button
              type="button"
              @click="addTag"
              class="rounded-xl border border-[#D0D0D0] px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#F4F4F4]"
            >
              {{ t('common.documentUploadModal.addTag') }}
            </button>
          </div>
          <div v-if="form.tags.length" class="flex flex-wrap gap-1">
            <span
              v-for="tag in form.tags"
              :key="tag"
              class="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-600"
            >
              #{{ tag }}
              <button @click="removeTag(tag)" class="hover:text-red-500">✕</button>
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            :disabled="docs.loading"
            @click="emit('close')"
            class="rounded-xl border border-[#D0D0D0] px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#F4F4F4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ t('common.documentUploadModal.cancelButton') }}
          </button>
          <button
            type="button"
            @click="submit"
            :disabled="docs.loading"
            class="rounded-xl bg-[#0057BD] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0948A0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span v-if="docs.loading" class="flex items-center gap-2">
              <svg class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              {{ t('common.documentUploadModal.uploading') }}
            </span>
            <span v-else>{{ t('common.documentUploadModal.uploadButton') }}</span>
          </button>
        </div>

      </div>
    </div>
  </div>
</template>
