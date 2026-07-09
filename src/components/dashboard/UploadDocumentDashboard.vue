<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useDocumentsStore } from '@/stores/documents.store'
import { useMajorsStore } from '@/stores/majors.store'
import { useSubjectsStore } from '@/stores/subjects.store'
import { useI18n } from 'vue-i18n'
import SelectDropdown from '@/components/common/SelectDropdown.vue'
import { TEXT_NAME_PATTERN, TEXT_TAG_PATTERN, sanitizeTextName, isLanguageMajor, cefrLevel, LANGUAGE_LEVEL_COUNT, formatFileSize } from '@/utils/format'

const docs = useDocumentsStore()
const majors = useMajorsStore()
const subjects = useSubjectsStore()
const { t } = useI18n({ useScope: 'global' })

const emit = defineEmits<{ (e: 'close'): void; (e: 'uploaded'): void }>()

// When present, the modal edits this upload's metadata instead of creating one.
const props = defineProps<{
  editDoc?: {
    id: string
    title: string
    doc_type: string
    year_level?: number | null
    academic_year?: string | null
    majors?: { id: string } | null
    subjects?: { id: string } | null
    document_tags?: { tag: string }[]
    documents?: { id: string; original_name?: string | null; file_size_kb?: number }[]
  } | null
}>()
const isEditing = computed(() => !!props.editDoc)

// Existing files (edit mode) the user has marked for removal.
const removedFileIds = ref<string[]>([])
const existingFiles = computed(() =>
  (props.editDoc?.documents ?? []).filter((f) => !removedFileIds.value.includes(f.id)),
)
function removeExistingFile(id: string) {
  removedFileIds.value.push(id)
}
function removeSelectedFile(target: File) {
  selectedFiles.value = selectedFiles.value.filter((f) => f !== target)
}
// Suppress the cascading major→year→subject resets while prefilling for edit.
const isPrefilling = ref(false)

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const isDragActive = ref(false)
const tagInput = ref('')
const tagError = ref('')

const form = reactive({
  title: '',
  doc_type: '',
  year_level: '',
  academic_year: '',
  major_id: '',
  subject_id: '',
  tags: [] as string[],
})

const errors = reactive({
  title: '',
  doc_type: '',
  year_level: '',
  academic_year: '',
  major_id: '',
  file: '',
})

watch(
  () => form.major_id,
  () => {
    if (!isPrefilling.value) form.year_level = ''
  },
)

watch(
  () => [form.major_id, form.year_level],
  async ([majorId, yearLevel]) => {
    if (!isPrefilling.value) form.subject_id = ''
    if (majorId && yearLevel) {
      await subjects.fetchByMajorAndYear(majorId, Number(yearLevel))
    } else if (majorId) {
      await subjects.fetchByMajorAndYear(majorId, 0)
    }
  },
)

// Prefill the form when editing an existing upload.
if (props.editDoc) {
  const d = props.editDoc
  isPrefilling.value = true
  form.title = d.title ?? ''
  form.doc_type = d.doc_type ?? ''
  form.major_id = d.majors?.id ?? ''
  form.year_level = d.year_level ? String(d.year_level) : ''
  form.academic_year = d.academic_year ?? ''
  form.subject_id = d.subjects?.id ?? ''
  form.tags = d.document_tags?.map((tg) => tg.tag) ?? []
  // Let the guarded watchers flush (fetching subjects) before re-enabling resets.
  void nextTick().then(() => {
    isPrefilling.value = false
  })
}

const docTypeOptions = computed(() => docs.docTypes.map((type) => ({ value: type, label: type })))

const majorOptions = computed(() => majors.majors.map((m) => ({ value: m.id, label: m.acronym })))

const subjectOptions = computed(() =>
  subjects.subjects.map((s) => ({ value: s.id, label: s.name })),
)

const isFoundation = computed(() => {
  const major = majors.majors.find((m) => m.id === form.major_id)
  return major?.acronym?.toLowerCase() === 'foundation'
})

// English & French use CEFR levels (A1–B2) instead of numeric years.
const selectedMajorAcronym = computed(
  () => majors.majors.find((m) => m.id === form.major_id)?.acronym,
)

const yearLevelOptions = computed(() => {
  if (isLanguageMajor(selectedMajorAcronym.value)) {
    // Years 1–4 are CEFR levels (A1–B2); year 5 is a normal "Year 5".
    return Array.from({ length: LANGUAGE_LEVEL_COUNT }, (_, i) => {
      const n = i + 1
      return { value: String(n), label: cefrLevel(selectedMajorAcronym.value, n) ?? `Year ${n}` }
    })
  }
  return isFoundation.value
    ? [
        { value: '1', label: 'Year 1' },
        { value: '2', label: 'Year 2' },
      ]
    : [
        { value: '3', label: 'Year 3' },
        { value: '4', label: 'Year 4' },
        { value: '5', label: 'Year 5' },
      ]
})

// Initialise
docs.fetchDocTypes()
majors.fetchMajors()
if (form.major_id) subjects.fetchByMajorAndYear(form.major_id, 0)

function addFilesToSelection(files: File[]) {
  // Append (so editing adds to existing files), de-duping by name+size.
  const key = (f: File) => `${f.name}-${f.size}`
  const seen = new Set(selectedFiles.value.map(key))
  for (const f of files) {
    if (!seen.has(key(f))) selectedFiles.value.push(f)
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (!files.length) return
  addFilesToSelection(files)
  input.value = '' // allow re-selecting the same file
  errors.file = ''
  const firstFile = files[0]
  if (selectedFiles.value.length === 1 && firstFile && !form.title) {
    form.title = sanitizeTextName(firstFile.name.replace(/\.[^.]+$/, ''))
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
  addFilesToSelection(files)
  errors.file = ''
  const firstFile = files[0]
  if (selectedFiles.value.length === 1 && firstFile && !form.title) {
    form.title = sanitizeTextName(firstFile.name.replace(/\.[^.]+$/, ''))
  }
}

function validateTagInput() {
  const tag = tagInput.value.trim().toLowerCase()
  tagError.value =
    tag && !TEXT_TAG_PATTERN.test(tag) ? t('common.documentUploadModal.errorTagInvalid') : ''
  return !tagError.value
}

function addTag() {
  const tag = tagInput.value.trim().toLowerCase()
  if (!tag) return
  if (!validateTagInput()) return
  if (!form.tags.includes(tag) && form.tags.length < 3) {
    form.tags.push(tag)
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  form.tags = form.tags.filter((t) => t !== tag)
}

function validateAcademicYear(value: string): string {
  if (!value) return t('common.documentUploadModal.errorAcademicYearRequired')
  const match = value.match(/^(\d{4})-(\d{4})$/)
  if (!match) return t('common.documentUploadModal.errorAcademicYearFormat')
  const start = parseInt(match[1] ?? '')
  const end = parseInt(match[2] ?? '')
  if (end !== start + 1)
    return t('common.documentUploadModal.errorAcademicYearEnd', { year: start + 1 })
  return ''
}

function validateTitle() {
  const needsTitle = isEditing.value || selectedFiles.value.length <= 1
  const title = form.title.trim()
  if (needsTitle && !title) {
    errors.title = t('common.documentUploadModal.errorTitleRequired')
  } else if (title && !TEXT_NAME_PATTERN.test(title)) {
    errors.title = t('common.documentUploadModal.errorTitleInvalid')
  } else {
    errors.title = ''
  }
}

function validate() {
  validateTitle()
  errors.doc_type = form.doc_type ? '' : t('common.documentUploadModal.errorSelectType')
  errors.year_level = form.year_level ? '' : t('common.documentUploadModal.errorSelectYear')
  errors.academic_year = validateAcademicYear(form.academic_year)
  errors.major_id = form.major_id ? '' : t('common.documentUploadModal.errorSelectMajor')
  // An upload must end up with at least one file.
  const totalFiles = isEditing.value
    ? existingFiles.value.length + selectedFiles.value.length
    : selectedFiles.value.length
  errors.file = totalFiles >= 1 ? '' : t('common.documentUploadModal.errorSelectFile')
  return !Object.values(errors).some(Boolean)
}

async function submit() {
  if (!validate()) return

  // Edit mode — update metadata, remove marked files, add new files.
  if (isEditing.value && props.editDoc) {
    try {
      await docs.updateDocument(props.editDoc.id, {
        title: form.title.trim(),
        doc_type: form.doc_type,
        year_level: Number(form.year_level),
        academic_year: form.academic_year || undefined,
        major_id: form.major_id,
        subject_id: form.subject_id || null,
        tags: form.tags,
      })
      // Add first so removing the old files never trips the "keep ≥1 file" guard.
      if (selectedFiles.value.length) {
        await docs.addFiles(props.editDoc.id, selectedFiles.value)
      }
      for (const fileId of removedFileIds.value) {
        await docs.removeFile(fileId)
      }
      emit('uploaded')
      emit('close')
    } catch {
      // docs.error is set by store
    }
    return
  }

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
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-5">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-black">
          {{ isEditing ? t('common.documentUploadModal.editTitle') : t('common.documentUploadModal.docUpload') }}
        </h2>
        <button @click="emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Server error -->
      <div
        v-if="docs.error"
        class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
      >
        {{ docs.error }}
      </div>

      <!-- Existing files (edit mode) — each can be removed -->
      <div v-if="isEditing && existingFiles.length" class="flex flex-col gap-1.5">
        <p class="text-xs font-medium text-gray-500">
          {{ t('common.documentUploadModal.currentFiles') }}
        </p>
        <div
          v-for="file in existingFiles"
          :key="file.id"
          class="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
        >
          <span class="text-xs text-gray-600 truncate">
            {{ file.original_name }}
            <span class="text-gray-400">({{ formatFileSize(file.file_size_kb ?? 0) }})</span>
          </span>
          <button
            type="button"
            @click="removeExistingFile(file.id)"
            class="shrink-0 p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
            :title="t('common.documentUploadModal.removeFile')"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- File drop zone (also used to ADD files when editing) -->
      <div
        class="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors"
        :class="
          isDragActive
            ? 'border-[#0057BD] bg-blue-50/30'
            : 'border-[#D9D9D9] hover:border-[#0057BD]'
        "
        @click="fileInput?.click()"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
      >
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.rar"
          multiple
          @change="onFileChange"
        />
        <div class="flex items-center justify-center gap-2">
          <div
            class="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#E8EEF8] text-[#8A8A8A]"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-7 w-7"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <polyline points="14 2 14 8 20 8" stroke-linecap="round" stroke-linejoin="round" />
              <line x1="12" y1="18" x2="12" y2="12" stroke-linecap="round" />
              <line x1="9" y1="15" x2="15" y2="15" stroke-linecap="round" />
            </svg>
          </div>
        </div>
        <div v-if="selectedFiles.length" class="text-sm text-gray-700 font-medium">
          <p class="mb-2">{{ selectedFiles.length }} file(s) selected</p>
          <ul class="max-h-24 space-y-1 overflow-y-auto text-xs text-gray-500">
            <li
              v-for="file in selectedFiles"
              :key="file.name + file.size"
              class="flex items-center justify-between gap-2"
            >
              <span class="truncate">{{ file.name }} ({{ formatFileSize(file.size / 1024) }})</span>
              <button
                type="button"
                @click.stop="removeSelectedFile(file)"
                class="shrink-0 text-gray-400 hover:text-red-500"
                :title="t('common.documentUploadModal.removeFile')"
              >
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          </ul>
        </div>
        <div v-else class="text-gray-400 text-sm">
          <p class="font-medium text-gray-600 mb-1">
            {{ t('common.documentUploadModal.selectFile') }}
          </p>
          <p>PDF, Word, PowerPoint, Image — max 20MB each</p>
        </div>
      </div>
      <p v-if="errors.file" class="text-red-500 text-sm -mt-3">{{ errors.file }}</p>

      <!-- Title -->
      <div>
        <label class="text-sm font-medium text-gray-700 block mb-1">{{
          t('common.documentUploadModal.title')
        }}</label>
        <input
          v-model="form.title"
          type="text"
          placeholder="e.g. Midterm Notes Chapter 1-5"
          @blur="validateTitle"
          class="w-full border border-[#D9D9D9] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p v-if="errors.title" class="text-red-500 text-sm mt-1">{{ errors.title }}</p>
      </div>

      <!-- Type + Year + Academic Year + Major row -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1">{{
            t('common.documentUploadModal.typeLabel')
          }}</label>
          <SelectDropdown
            v-model="form.doc_type"
            placeholder="Select type"
            :options="docTypeOptions"
            @change="
              errors.doc_type = form.doc_type ? '' : t('common.documentUploadModal.errorSelectType')
            "
          />
          <p v-if="errors.doc_type" class="text-red-500 text-sm mt-1">{{ errors.doc_type }}</p>
        </div>

        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1">
            {{ t('common.documentUploadModal.academicYearLabel') }}
          </label>
          <input
            type="text"
            v-model="form.academic_year"
            placeholder="e.g. 2024-2025"
            maxlength="9"
            @blur="errors.academic_year = validateAcademicYear(form.academic_year)"
            class="w-full border border-[#D9D9D9] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            :class="errors.academic_year ? 'border-red-400' : ''"
          />
          <p v-if="errors.academic_year" class="text-red-500 text-sm mt-1">
            {{ errors.academic_year }}
          </p>
        </div>

        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1">{{
            t('common.documentUploadModal.majorLabel')
          }}</label>
          <SelectDropdown
            v-model="form.major_id"
            placeholder="Select major"
            :options="majorOptions"
            @change="
              errors.major_id = form.major_id
                ? ''
                : t('common.documentUploadModal.errorSelectMajor')
            "
          />
          <p v-if="errors.major_id" class="text-red-500 text-sm mt-1">{{ errors.major_id }}</p>
        </div>

        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1">
            {{ t('common.documentUploadModal.yearLevelLabel') }}
          </label>
          <SelectDropdown
            v-model="form.year_level"
            placeholder="Select year"
            :options="yearLevelOptions"
            @change="
              errors.year_level = form.year_level
                ? ''
                : t('common.documentUploadModal.errorSelectYear')
            "
          />
          <p v-if="errors.year_level" class="text-red-500 text-sm mt-1">{{ errors.year_level }}</p>
        </div>
      </div>

      <!-- Subject -->
      <div v-if="form.major_id && form.year_level">
        <label class="text-sm font-medium text-gray-700 block mb-1">{{
          t('common.documentUploadModal.subjectLabel')
        }}</label>
        <SelectDropdown
          v-if="subjectOptions.length"
          v-model="form.subject_id"
          placeholder="Select subject"
          :options="subjectOptions"
        />
        <p v-else class="text-sm text-gray-400">No subjects available</p>
      </div>

      <!-- Tags -->
      <div>
        <label class="text-sm font-medium text-gray-700 block mb-1">
          Tags <span class="text-gray-400 font-normal">(optional, max 3)</span>
        </label>
        <div class="flex gap-2">
          <input
            v-model="tagInput"
            @keydown.enter.prevent="addTag"
            @blur="validateTagInput"
            @input="tagError = ''"
            type="text"
            placeholder="e.g. midterm"
            class="flex-1 border border-[#D9D9D9] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            @click="addTag"
            class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors"
          >
            Add
          </button>
        </div>
        <p v-if="tagError" class="text-red-500 text-sm mt-1">{{ tagError }}</p>
        <div v-if="form.tags.length" class="flex flex-wrap gap-1 mt-2">
          <span
            v-for="tag in form.tags"
            :key="tag"
            class="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full"
          >
            #{{ tag }}
            <button @click="removeTag(tag)" class="hover:text-red-500">✕</button>
          </span>
        </div>
      </div>

      <!-- Submit -->
      <button
        @click="submit"
        :disabled="docs.loading"
        class="w-full bg-[#008CB9] hover:bg-[#006B8C] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
      >
        <span v-if="docs.loading" class="flex items-center justify-center gap-2">
          <svg
            class="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          {{ isEditing ? t('common.documentUploadModal.saving') : t('common.documentUploadModal.uploading') }}
        </span>
        <span v-else>{{ isEditing ? t('common.documentUploadModal.saveButton') : t('common.documentUploadModal.uploadButton') }}</span>
      </button>
    </div>
  </div>
</template>
