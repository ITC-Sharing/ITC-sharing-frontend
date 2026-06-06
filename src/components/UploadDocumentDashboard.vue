<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useDocumentsStore } from '@/stores/documents.store'
import { useMajorsStore } from '@/stores/majors.store'
import { useSubjectsStore } from '@/stores/subjects.store'
import { useI18n } from 'vue-i18n'
import SelectDropdown from '@/components/SelectDropdown.vue'

const docs = useDocumentsStore()
const majors = useMajorsStore()
const subjects = useSubjectsStore()
const { t } = useI18n({ useScope: 'global' })

const emit = defineEmits<{ (e: 'close'): void; (e: 'uploaded'): void }>()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const isDragActive = ref(false)
const tagInput = ref('')

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
  () => { form.year_level = '' },
)

watch(
  () => [form.major_id, form.year_level],
  async ([majorId, yearLevel]) => {
    form.subject_id = ''
    if (majorId && yearLevel) {
      await subjects.fetchByMajorAndYear(majorId, Number(yearLevel))
    } else if (majorId) {
      await subjects.fetchByMajorAndYear(majorId, 0)
    }
  },
)

const docTypeOptions = computed(() =>
  docs.docTypes.map((type) => ({ value: type, label: type })),
)

const majorOptions = computed(() =>
  majors.majors.map((m) => ({ value: m.id, label: m.acronym })),
)

const subjectOptions = computed(() =>
  subjects.subjects.map((s) => ({ value: s.id, label: s.name })),
)

const isFoundation = computed(() => {
  const major = majors.majors.find((m) => m.id === form.major_id)
  return major?.acronym?.toLowerCase() === 'foundation'
})

const yearLevelOptions = computed(() =>
  isFoundation.value
    ? [{ value: '1', label: 'Year 1' }, { value: '2', label: 'Year 2' }]
    : [{ value: '3', label: 'Year 3' }, { value: '4', label: 'Year 4' }, { value: '5', label: 'Year 5' }],
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

// Replace the academic_year validation in validate()
function validateAcademicYear(value: string): string {
  if (!value) return 'Please enter an academic year'
  const match = value.match(/^(\d{4})-(\d{4})$/)
  if (!match) return 'Format must be YYYY-YYYY (e.g. 2024-2025)'
  const start = parseInt(match[1])
  const end = parseInt(match[2])
  if (end !== start + 1) return `End year must be exactly ${start + 1}`
  return ''
}

function validate() {
  const needsTitle = selectedFiles.value.length <= 1
  errors.title = needsTitle && !form.title ? 'Title is required' : ''
  errors.doc_type = form.doc_type ? '' : 'Please select a type'
  errors.year_level = form.year_level ? '' : 'Please select a year level'
  errors.academic_year = validateAcademicYear(form.academic_year)
  errors.major_id = form.major_id ? '' : 'Please select a major'
  errors.file = selectedFiles.value.length ? '' : 'Please choose a file'
  return !Object.values(errors).some(Boolean)
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
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-5">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-black">
          {{ t('common.documentUploadModal.docUpload') }}
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

      <!-- File drop zone -->
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
        <div v-if="selectedFiles.length" class="text-sm text-gray-700 font-medium">
          <p class="mb-2">{{ selectedFiles.length }} file(s) selected</p>
          <ul class="max-h-24 space-y-1 overflow-y-auto text-xs text-gray-500">
            <li v-for="file in selectedFiles" :key="file.name + file.size">
              {{ file.name }} ({{ (file.size / 1024).toFixed(0) }} KB)
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
            @change="errors.doc_type = form.doc_type ? '' : 'Please select a type'"
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
            @change="errors.major_id = form.major_id ? '' : 'Please select a major'"
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
            @change="errors.year_level = form.year_level ? '' : 'Please select a year level'"
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
        class="w-full bg-[#0057BD] hover:bg-[#0948A0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
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
          {{ t('common.documentUploadModal.uploading') }}
        </span>
        <span v-else>{{ t('common.documentUploadModal.uploadButton') }}</span>
      </button>
    </div>
  </div>
</template>
