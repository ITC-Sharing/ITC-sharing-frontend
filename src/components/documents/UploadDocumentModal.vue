<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useDocumentsStore } from '@/stores/documents.store'
import { useMajorsStore } from '@/stores/majors.store'
import { useSubjectsStore } from '@/stores/subjects.store'
import { useI18n } from 'vue-i18n'
import SelectDropdown from '@/components/common/SelectDropdown.vue'
import ChipButton from '@/components/common/ChipButton.vue'
import AudiencePicker from '@/components/common/AudiencePicker.vue'
import DateField from '@/components/common/DateField.vue'
import RingSpinner from '@/components/common/RingSpinner.vue'
import FileTypeIcon from '@/components/common/FileTypeIcon.vue'
import type { AudienceEntry } from '@/types'
import { clearDraft, readDraft, writeDraft } from '@/composables/uploadDraft'
import { useToast } from '@/composables/useToast'
import {
  TEXT_NAME_PATTERN,
  sanitizeTextName,
  isImageFile,
  isLanguageMajor,
  languageLabelKey,
  yearLevelsForMajor,
} from '@/utils/format'

const auth = useAuthStore()
const docs = useDocumentsStore()
const majors = useMajorsStore()
const subjects = useSubjectsStore()
const { t } = useI18n({ useScope: 'global' })
const { showToast } = useToast()

const emit = defineEmits<{ (e: 'close'): void; (e: 'uploaded'): void }>()

// Each picked file starts uploading immediately, so the transfer overlaps with
// filling in the form. A row tracks its own progress; only rows that finished
// ('done', with a staged id) are submitted.
type StagedItem = {
  /** Kept so a failed row can be retried without re-picking the file. Absent on
   *  rows restored from a draft — those already finished uploading. */
  file?: File
  name: string
  sizeKb: number
  progress: number
  // 'processing': the bytes are all sent and the server is still working —
  // Office files get converted to a PDF preview, which takes a moment.
  status: 'uploading' | 'processing' | 'done' | 'error'
  id?: string
  error?: string
  /** Object URL for an image thumbnail; revoked when the row goes away. */
  previewUrl?: string
  /** The staged file's own URL — outlives the page, unlike the object URL. */
  stagedUrl?: string
}
const stagedItems = ref<StagedItem[]>([])
const uploadedItems = computed(() => stagedItems.value.filter((i) => i.status === 'done'))
const isStaging = computed(() =>
  stagedItems.value.some((i) => i.status === 'uploading' || i.status === 'processing'),
)

// The tile row scrolls sideways, and a scroll box can't paint outside itself —
// so the name popup is teleported to <body> and positioned against the hovered
// tile instead of living inside the row.
const hoveredName = ref('')
const hoveredAt = reactive({ left: 0, top: 0 })

function showName(item: StagedItem, event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  hoveredName.value = item.name
  hoveredAt.left = rect.left + rect.width / 2
  hoveredAt.top = rect.bottom + 8
}

function hideName() {
  hoveredName.value = ''
}

/** Still in flight — sending bytes or waiting on the server. */
function isPending(item: StagedItem) {
  return item.status === 'uploading' || item.status === 'processing'
}

const isDragActive = ref(false)
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
  // Who can see this, as (department, year) pairs — picked one at a time.
  // Empty = no restriction.
  audience: [] as AudienceEntry[],
  // Soft expiry as a datetime-local string ('YYYY-MM-DDTHH:mm'); '' = never.
  expires_at: '',
  // Optional free-text description (replaced tags).
  description: '',
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
  audience: '',
  expires_at: '',
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

// A language course is asked for Grammar/Speaking/… where a department course
// is asked for Note/TD/… — the doc's major decides which list is offered.
const docTypeOptions = computed(() =>
  (isLanguageDoc.value ? docs.languageDocTypes : docs.departmentDocTypes).map((type) => ({
    value: type,
    label: type,
  })),
)

const majorOptions = computed(() => majors.majors.map((m) => ({ value: m.id, label: m.acronym })))

const subjectOptions = computed(() =>
  subjects.subjects.map((s) => ({ value: s.id, label: s.name })),
)

// Academic years as `YYYY-YYYY`, current year back 7 years — matches validateAcademicYear.
const academicYearOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 8 }, (_, i) => {
    const start = currentYear - i
    const value = `${start}-${start + 1}`
    return { value, label: value }
  })
})

// Who can see this, built one pair at a time: pick a department, then the year
// within it, and the pair lands in the list as "I3-GIC". Storing pairs (rather
// than a list of departments AND a list of years) is what lets "GIC year 3 and
// AMS year 5" mean exactly that.
//
// The Department of Foreign Languages runs courses every ITC student takes; it
// isn't a department anyone registers into, so it's never offered here — an
// upload aimed at it would match no viewer at all. A doc that BELONGS to it
// carries no audience either: the whole field is hidden and left empty, which
// the backend reads as visible to everyone.
const docMajorAcronym = computed(() => majors.majors.find((m) => m.id === form.major_id)?.acronym)
const isLanguageDoc = computed(() => isLanguageMajor(docMajorAcronym.value))

// DFL's year_level holds the language; its CEFR levels are subjects. The field
// is labelled to match, so it never reads "Year Level: English".
const yearLevelLabel = computed(() =>
  isLanguageDoc.value
    ? t('document.documentUploadModal.languageLabel')
    : t('document.documentUploadModal.yearLevelLabel'),
)

const yearLevelDisplay = computed(() => {
  const languageKey = languageLabelKey(docMajorAcronym.value, form.year_level)
  return languageKey ? t(languageKey) : form.year_level
})

// Who can see this, built one answer at a time: the picker opens on the
// departments and drills into that department's years, so "GIC → Third Year"
// lands in the list as "I3-GIC". Storing pairs (rather than a list of
// departments AND a list of years) is what lets "GIC year 3 and AMS year 5"
// mean exactly that. "Everyone" is a choice of its own — no pairs at all, which
// the backend reads as no restriction.
const audienceEveryone = ref(false)

const audienceDepartments = computed(() =>
  majors.majors
    .filter((m) => !isLanguageMajor(m.acronym))
    .map((m) => ({
      id: m.id,
      acronym: m.acronym,
      // Only the years that department actually has students in.
      years: yearLevelsForMajor(m.acronym).map((year) => ({
        value: year,
        label: t('document.documentUploadModal.audienceYearN', { year }),
      })),
    })),
)

/** "I3-GIC" — the year first, matching how the subject pages label a level. */
function audienceLabel(entry: AudienceEntry) {
  const acronym = majors.majors.find((m) => m.id === entry.major_id)?.acronym ?? '?'
  return `I${entry.year_level}-${acronym}`
}

function addAudience(choice: { everyone: true } | AudienceEntry) {
  errors.audience = ''
  if ('everyone' in choice) {
    // "Everyone" isn't a restriction, so it replaces whatever was picked.
    audienceEveryone.value = true
    form.audience = []
    return
  }
  const exists = form.audience.some(
    (a: AudienceEntry) => a.major_id === choice.major_id && a.year_level === choice.year_level,
  )
  if (!exists) form.audience.push(choice)
  // A department + year is a restriction, so it replaces "Everyone".
  audienceEveryone.value = false
}

function removeAudience(entry: AudienceEntry) {
  form.audience = form.audience.filter((a: AudienceEntry) => a !== entry)
}

// A language doc has no audience at all; anything already picked is dropped.
watch(isLanguageDoc, (isLanguage) => {
  if (isLanguage) {
    form.audience = []
    audienceEveryone.value = false
  }
})

// ── Draft ──────────────────────────────────────────────────────────────────
// Closing the modal — deliberately or by a stray click on the backdrop — keeps
// what was typed. Files survive too: they were staged server-side the moment
// they were picked, so the draft only has to remember their ids. It lives in
// memory for this page session only; a reload starts from a clean form.
// A draft belongs to the page it was started on: the subject/level context is
// locked into the form, so restoring it somewhere else would mislabel the doc.
const draftContext = computed(() =>
  [lockedMajorId.value, lockedYearLevel.value, lockedSubjectId.value].join('|'),
)

type Draft = {
  form: Partial<typeof form>
  audienceEveryone: boolean
  expiryChosen: boolean
  files: { id: string; name: string; sizeKb: number; previewUrl?: string }[]
}

function saveDraft() {
  const files = uploadedItems.value.map((item) => ({
    id: item.id!,
    name: item.name,
    sizeKb: item.sizeKb,
    // The object URL dies with the page; the staged file's own URL doesn't.
    previewUrl: item.stagedUrl,
  }))
  const isBlank =
    !files.length &&
    !form.title.trim() &&
    !form.doc_type &&
    !form.academic_year &&
    !form.description.trim() &&
    !form.expires_at &&
    !form.audience.length &&
    !audienceEveryone.value &&
    !expiryChosen.value
  if (isBlank) {
    clearDraft(draftContext.value)
    return
  }
  writeDraft(draftContext.value, {
    form: { ...form },
    audienceEveryone: audienceEveryone.value,
    expiryChosen: expiryChosen.value,
    files,
  } satisfies Draft)
}

function restoreDraft() {
  const draft = readDraft<Draft>(draftContext.value)
  if (!draft) return
  Object.assign(form, draft.form)
  audienceEveryone.value = draft.audienceEveryone
  expiryChosen.value = draft.expiryChosen
  stagedItems.value = draft.files.map((file) =>
    reactive<StagedItem>({
      name: file.name,
      sizeKb: file.sizeKb,
      progress: 100,
      status: 'done',
      id: file.id,
      previewUrl: file.previewUrl,
    }),
  )
}

// Save as the user types, coalesced so a keystroke isn't a write.
let draftTimer: ReturnType<typeof setTimeout>
watch(
  [form, stagedItems, audienceEveryone],
  () => {
    clearTimeout(draftTimer)
    draftTimer = setTimeout(saveDraft, 300)
  },
  { deep: true },
)

restoreDraft()

// ── Expiry ─────────────────────────────────────────────────────────────────
// Local 'YYYY-MM-DD' for a date input.
function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const todayStr = toDateInput(new Date())

const expiryPresets = [
  { key: 'expiresPresetWeek', days: 7 },
  { key: 'expiresPresetMonth', days: 30 },
  { key: 'expiresPreset3Months', days: 90 },
  { key: 'expiresPreset6Months', days: 180 },
  { key: 'expiresPresetYear', days: 365 },
] as const

// The custom date picker is shown by default; the "+" chip toggles it.
const showCustomDate = ref(true)

// The date a preset resolves to (today + N days).
function presetDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toDateInput(d)
}

// "Expires on" is a required choice, like the audience — but "Never" is an
// answer too, and an empty date can't tell "never" from "not answered yet".
// This flag is what the asterisk actually means.
const expiryChosen = ref(false)

function chooseNever() {
  form.expires_at = ''
  showCustomDate.value = false
  expiryChosen.value = true
  errors.expires_at = ''
}

function onExpiryDateChange(value: string) {
  expiryChosen.value = !!value
  errors.expires_at = ''
}

// A preset is "active" when it's the chosen expiry and the custom picker is closed.
function isPresetActive(days: number): boolean {
  return !showCustomDate.value && form.expires_at === presetDate(days)
}

// Picking a preset selects it and collapses the custom picker.
function setExpiryInDays(days: number) {
  form.expires_at = presetDate(days)
  showCustomDate.value = false
  expiryChosen.value = true
  errors.expires_at = ''
}

// The "+" toggles the custom picker. Opening it always starts from a blank
// date (dd/mm/yyyy) rather than carrying over a preset's calculated date.
function toggleCustomDate() {
  showCustomDate.value = !showCustomDate.value
  if (showCustomDate.value) form.expires_at = ''
}

// The `min` on the date input is only a hint — it can be edited away in the
// browser — so the chosen date is re-checked here (and again on the server).
// A date expires at the END of its local day, so today is still in the future.
function validateExpiry(): string {
  if (!form.expires_at) return '' // '' = never expires
  const end = new Date(`${form.expires_at}T23:59:59`)
  if (Number.isNaN(end.getTime())) return t('document.documentUploadModal.errorExpiryInvalid')
  if (end.getTime() <= Date.now()) return t('document.documentUploadModal.errorExpiryPast')
  return ''
}

const expirySummary = computed(() => {
  if (!form.expires_at) return null
  return new Date(`${form.expires_at}T23:59:59`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

// Initialise
docs.fetchDocTypes()
majors.fetchMajors()
if (form.major_id) subjects.fetchByMajorAndYear(form.major_id, 0)

// Send each file straight to the server and track its own progress. Appends to
// the list, de-duping by name+size so the same file isn't staged twice.
function stageFiles(files: File[]) {
  if (!files.length) return
  errors.file = ''

  const seen = new Set(stagedItems.value.map((i) => `${i.name}-${i.sizeKb}`))
  const firstFile = files[0]
  if (files.length === 1 && firstFile && !form.title) {
    form.title = sanitizeTextName(firstFile.name.replace(/\.[^.]+$/, ''))
  }

  for (const file of files) {
    const sizeKb = Math.round(file.size / 1024)
    if (seen.has(`${file.name}-${sizeKb}`)) continue

    const item = reactive<StagedItem>({
      file,
      name: file.name,
      sizeKb,
      progress: 0,
      status: 'uploading',
      previewUrl: isImageFile(file.name) ? URL.createObjectURL(file) : undefined,
    })
    stagedItems.value.push(item)
    void sendStagedItem(item)
  }
}

// Push one row's file to the server, tracking its own progress.
async function sendStagedItem(item: StagedItem) {
  if (!item.file) return
  item.status = 'uploading'
  item.progress = 0
  item.error = undefined
  try {
    const staged = await docs.stageFile(item.file!, (percent) => {
      item.progress = percent
      // The last byte is sent long before the response comes back.
      if (percent >= 100) item.status = 'processing'
    })
    item.id = staged.id
    if (isImageFile(item.name)) item.stagedUrl = staged.file_url
    item.progress = 100
    item.status = 'done'
  } catch (e: unknown) {
    item.status = 'error'
    item.error =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      t('document.documentUploadModal.errorFileUploadFailed')
  }
}

// "Try again" on a failed row — same file, same position in the list.
function retryStagedItem(item: StagedItem) {
  void sendStagedItem(item)
}

// Drop the row, and the object with it when the server already has the file.
function removeStagedItem(item: StagedItem) {
  // The tile disappears under the cursor, so its mouseleave never fires and the
  // name popup would be left hanging over the form.
  hideName()
  stagedItems.value = stagedItems.value.filter((i) => i !== item)
  if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  if (item.id) void docs.deleteStagedFile(item.id).catch(() => {})
}

// Esc closes the modal. Nothing is lost — the draft is saved as you type.
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
    return
  }
  if (event.key !== 'Enter') return

  // Enter belongs to whatever has focus first: a newline in the description, and
  // the button/dropdown it would otherwise activate. isComposing guards IME
  // input, where Enter commits the candidate rather than meaning "go".
  const target = event.target as HTMLElement | null
  if (event.isComposing || target?.tagName === 'TEXTAREA' || target?.tagName === 'BUTTON') return
  // Nothing to submit while a file is still on its way or an upload is running.
  if (docs.loading || isStaging.value) return

  event.preventDefault()
  void submit()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

// Thumbnails hold a blob alive until they're released.
onBeforeUnmount(() => {
  for (const item of stagedItems.value) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  }
})

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  stageFiles(Array.from(input.files ?? []))
  // Let the same file be picked again after it's removed.
  input.value = ''
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
  stageFiles(Array.from(event.dataTransfer?.files ?? []))
}

function validateTitle() {
  const needsTitle = uploadedItems.value.length <= 1
  const title = form.title.trim()
  if (needsTitle && !title) {
    errors.title = t('document.documentUploadModal.errorTitleRequired')
  } else if (title.length > 100) {
    errors.title = t('document.documentUploadModal.errorTitleTooLong')
  } else if (title && !TEXT_NAME_PATTERN.test(title)) {
    errors.title = t('document.documentUploadModal.errorTitleInvalid')
  } else {
    errors.title = ''
  }
}

function validate() {
  validateTitle()
  errors.doc_type = form.doc_type ? '' : t('document.documentUploadModal.errorSelectType')
  errors.year_level = form.year_level ? '' : t('document.documentUploadModal.errorSelectYear')
  errors.academic_year = validateAcademicYear(form.academic_year)
  errors.major_id = form.major_id ? '' : t('document.documentUploadModal.errorSelectMajor')
  errors.file = isStaging.value
    ? t('document.documentUploadModal.errorFilesStillUploading')
    : uploadedItems.value.length
      ? ''
      : t('document.documentUploadModal.errorSelectFile')
  errors.expires_at = expiryChosen.value
    ? validateExpiry()
    : t('document.documentUploadModal.errorSelectExpiry')
  // A language course has no audience to answer for — the field is hidden.
  errors.audience =
    isLanguageDoc.value || audienceEveryone.value || form.audience.length
      ? ''
      : t('document.documentUploadModal.errorSelectAudience')
  return !Object.values(errors).some(Boolean)
}

function validateAcademicYear(value: string): string {
  if (!value) return t('document.documentUploadModal.errorAcademicYearRequired')
  const match = value.match(/^(\d{4})-(\d{4})$/)
  if (!match) return t('document.documentUploadModal.errorAcademicYearFormat')
  const start = parseInt(match[1]!)
  const end = parseInt(match[2]!)
  if (end !== start + 1)
    return t('document.documentUploadModal.errorAcademicYearEnd', { year: start + 1 })
  const currentYear = new Date().getFullYear()
  if (start > currentYear)
    return t('document.documentUploadModal.errorAcademicYearFuture', { year: currentYear })
  return ''
}

async function submit() {
  if (!validate()) return

  // The bytes are already on the server — send the handles.
  const formData = new FormData()
  formData.append('staged_file_ids', JSON.stringify(uploadedItems.value.map((i) => i.id)))
  formData.append('title', form.title)
  formData.append('doc_type', form.doc_type)
  if (form.year_level) formData.append('year_level', form.year_level)
  if (form.academic_year) formData.append('academic_year', form.academic_year)
  formData.append('major_id', form.major_id)
  if (form.subject_id) formData.append('subject_id', form.subject_id)
  formData.append('audience', JSON.stringify(form.audience))
  // A chosen date expires at the END of that local day.
  if (form.expires_at)
    formData.append('expires_at', new Date(`${form.expires_at}T23:59:59`).toISOString())
  if (form.description.trim()) formData.append('description', form.description.trim())

  try {
    await docs.upload(formData)
    clearDraft(draftContext.value)
    showToast(t('common.toast.uploadSuccess'))
    emit('uploaded')
    emit('close')
  } catch {
    // docs.error is set by store
  }
}
</script>

<template>
  <!-- Backdrop — clicking it (but not the panel) closes, as does Esc. What was
       typed is kept in a draft, so neither loses the user's work. -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 md:max-w-md"
    >
      <!-- Header -->
      <div class="relative border-b border-black/5 px-5 py-4">
        <p class="text-center text-xl font-bold text-black">
          {{ t('document.documentUploadModal.docUpload') }}
        </p>
        <button
          type="button"
          class="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-primary/10 hover:text-primary hover:cursor-pointer"
          aria-label="Close"
          @click="emit('close')"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Scrollable form body -->
      <div class="min-h-0 flex-1 space-y-3 overflow-y-auto scrollbar-hide px-5 py-4">
        <!-- Server error -->
        <p v-if="docs.error" class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {{ docs.error }}
        </p>

        <!-- File drop zone -->
        <div class="space-y-3">
          <!-- The full drop zone until the first file lands; after that it
               shrinks to the "Add" tile at the head of the row, so the files
               themselves get the space. -->
          <label
            v-if="!stagedItems.length"
            class="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-6 text-center transition"
            :class="
              isDragActive
                ? 'border-primary bg-[#F3F8FF]'
                : 'border-[#D3D3D3] bg-[#FAFAFA] hover:border-primary hover:bg-[#F3F8FF]'
            "
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
          >
            <input
              type="file"
              class="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.rar"
              multiple
              @change="onFileChange"
            />
            <div
              class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <svg
                viewBox="0 0 24 24"
                class="h-6 w-6"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <polyline points="14 2 14 8 20 8" stroke-linecap="round" stroke-linejoin="round" />
                <path
                  d="M12 17v-5m-2.5 2.5L12 12l2.5 2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <p class="text-sm text-gray-600">
              <span class="font-semibold text-primary">
                {{ t('document.documentUploadModal.clickHere') }}
              </span>
              {{ t('document.documentUploadModal.selectFile') }}
            </p>
            <p class="mt-1 text-xs text-gray-400">
              {{ t('document.documentUploadModal.fileTypes') }}
            </p>
          </label>

          <!-- Attachments: one square tile each — a thumbnail for images, the
               type-coloured tile otherwise. Uploading starts when picked. -->
          <ul
            v-if="stagedItems.length"
            class="flex items-start gap-2.5 overflow-x-auto scrollbar-hide pb-2 pt-2"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
          >
            <!-- Add more: same 64px square as a file tile. -->
            <li class="shrink-0">
              <label
                class="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed text-center transition"
                :class="
                  isDragActive
                    ? 'border-primary bg-[#F3F8FF] text-primary'
                    : 'border-[#D3D3D3] text-gray-400 hover:border-primary hover:bg-[#F3F8FF] hover:text-primary'
                "
              >
                <input
                  type="file"
                  class="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.rar"
                  multiple
                  @change="onFileChange"
                />
                <svg
                  class="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 16V4m-4 4l4-4 4 4M4 18v1a1 1 0 001 1h14a1 1 0 001-1v-1"
                  />
                </svg>
                <span class="text-[11px] font-medium">
                  {{ t('document.documentUploadModal.addMoreFiles') }}
                </span>
              </label>
            </li>

            <li
              v-for="item in stagedItems"
              :key="`${item.name}-${item.sizeKb}`"
              class="group relative shrink-0"
              @mouseenter="showName(item, $event)"
              @mouseleave="hideName"
            >
              <div
                class="relative h-16 w-16 overflow-hidden rounded-2xl border"
                :class="item.status === 'error' ? 'border-red-300' : 'border-[#E5E7EB]'"
              >
                <img
                  v-if="item.previewUrl"
                  :src="item.previewUrl"
                  :alt="item.name"
                  class="h-full w-full object-cover"
                />
                <FileTypeIcon
                  v-else
                  :name="item.name"
                  variant="soft"
                  :size="64"
                  rounded="rounded-2xl"
                  with-label
                />

                <!-- Busy: dim the tile and spin over it. -->
                <div
                  v-if="isPending(item)"
                  class="absolute inset-0 flex items-center justify-center bg-white/70"
                >
                  <RingSpinner :size="20" :stroke="2.5" class="text-primary" />
                </div>

                <!-- Failed: the whole tile becomes the retry button. -->
                <button
                  v-else-if="item.status === 'error' && item.file"
                  type="button"
                  class="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-red-50/90 text-[10px] font-semibold text-red-600 hover:cursor-pointer"
                  :title="item.error"
                  @click="retryStagedItem(item)"
                >
                  <svg
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M4 4v5h5M20 20v-5h-5M20 9a8 8 0 00-14.9-2M4 15a8 8 0 0014.9 2"
                    />
                  </svg>
                  {{ t('document.documentUploadModal.tryAgain') }}
                </button>

                <!-- Hairline progress along the bottom edge while sending. -->
                <div
                  v-if="item.status === 'uploading'"
                  class="absolute inset-x-1.5 bottom-1.5 h-0.5 overflow-hidden rounded-full bg-gray-200"
                >
                  <div
                    class="h-full rounded-full bg-primary transition-all duration-200"
                    :style="{ width: `${item.progress}%` }"
                  />
                </div>
              </div>

              <!-- Remove — revealed on hover, and on keyboard focus so it stays
                   reachable without a pointer. -->
              <button
                type="button"
                class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-primary opacity-0 shadow-sm transition hover:bg-white hover:cursor-pointer group-hover:opacity-100 focus:opacity-100"
                :aria-label="`Remove ${item.name}`"
                @click="removeStagedItem(item)"
              >
                <svg
                  class="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <!-- Name on hover. Truncated to keep the pill from running off
                   the row; the full name stays in the tile's tooltip. -->
            </li>
          </ul>

          <p v-if="errors.file" class="text-sm text-red-600">{{ errors.file }}</p>
        </div>

        <!-- Title -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-black">
            {{ t('document.documentUploadModal.title') }} <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.title"
            type="text"
            :placeholder="t('document.documentUploadModal.titlePlaceholder')"
            class="w-full rounded-xl border border-[#D9D9D9] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary"
            :class="errors.title ? 'border-red-400' : ''"
            @blur="validateTitle"
            @input="errors.title = form.title ? '' : errors.title"
          />
          <p v-if="errors.title" class="text-sm text-red-600">{{ errors.title }}</p>
        </div>

        <!-- Type + Academic Year -->
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-2">
            <label class="text-sm font-medium text-black">
              {{ t('document.documentUploadModal.typeLabel') }} <span class="text-red-500">*</span>
            </label>
            <SelectDropdown
              v-model="form.doc_type"
              :placeholder="t('document.documentUploadModal.selectTypePlaceholder')"
              :options="docTypeOptions"
              @change="
                errors.doc_type = form.doc_type
                  ? ''
                  : t('document.documentUploadModal.errorSelectType')
              "
            />
            <p v-if="errors.doc_type" class="text-sm text-red-600">{{ errors.doc_type }}</p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-black">
              {{ t('document.documentUploadModal.academicYearLabel') }}
              <span class="text-red-500">*</span>
            </label>
            <SelectDropdown
              v-model="form.academic_year"
              :placeholder="t('document.documentUploadModal.academicYearPlaceholder')"
              :options="academicYearOptions"
              @change="errors.academic_year = validateAcademicYear(form.academic_year)"
            />
            <p v-if="errors.academic_year" class="text-sm text-red-600">
              {{ errors.academic_year }}
            </p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-black">
              {{ t('document.documentUploadModal.majorLabel') }} <span class="text-red-500">*</span>
            </label>
            <SelectDropdown
              v-model="form.major_id"
              :placeholder="t('document.documentUploadModal.selectMajorPlaceholder')"
              :options="majorOptions"
              :disabled="lockMajorAndSubject"
            />
            <p v-if="errors.major_id" class="text-sm text-red-600">{{ errors.major_id }}</p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-black">
              {{ yearLevelLabel }}
              <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              :value="yearLevelDisplay"
              @input="form.year_level = ($event.target as HTMLInputElement).value"
              :disabled="lockYearLevel"
              :placeholder="t('document.documentUploadModal.yearLevelPlaceholder')"
              class="w-full rounded-xl border border-[#D9D9D9] bg-[#F5F5F5] px-4 py-2.5 text-sm text-gray-600 outline-none"
            />
            <p v-if="errors.year_level" class="text-sm text-red-600">{{ errors.year_level }}</p>
          </div>
        </div>

        <!-- Subject -->
        <div v-if="form.major_id" class="space-y-2">
          <label class="text-sm font-medium text-black"
            >{{ t('document.documentUploadModal.subjectLabel') }}
            <span class="text-red-500">*</span>
          </label>
          <SelectDropdown
            v-model="form.subject_id"
            :placeholder="t('document.documentUploadModal.selectSubjectPlaceholder')"
            :options="subjectOptions"
            :disabled="lockMajorAndSubject"
          />
        </div>

        <!-- Audience: department, then year, one pair at a time. Everyone takes
             the language courses, so those docs skip this entirely. -->
        <div v-if="!isLanguageDoc" class="space-y-2">
          <label class="text-sm font-medium text-black">
            {{ t('document.documentUploadModal.audienceMajorLabel') }}
            <span class="text-red-500">*</span>
          </label>

          <AudiencePicker
            :departments="audienceDepartments"
            :placeholder="t('document.documentUploadModal.audienceMajorPlaceholder')"
            :everyone-label="t('document.documentUploadModal.audienceEveryone')"
            :all-years-label="t('document.documentUploadModal.audienceAllYears')"
            @select="addAudience"
          />

          <!-- The pairs picked so far. -->
          <div v-if="audienceEveryone || form.audience.length" class="flex flex-wrap gap-2">
            <span
              v-if="audienceEveryone"
              class="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
            >
              {{ t('document.documentUploadModal.audienceEveryone') }}
              <button
                type="button"
                class="flex h-4 w-4 items-center justify-center rounded text-primary transition hover:bg-primary/15 hover:cursor-pointer"
                :aria-label="t('document.documentUploadModal.audienceEveryone')"
                @click="audienceEveryone = false"
              >
                <svg
                  class="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>

            <span
              v-for="entry in form.audience"
              :key="`${entry.major_id}-${entry.year_level}`"
              class="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
            >
              {{ audienceLabel(entry) }}
              <button
                type="button"
                class="flex h-4 w-4 items-center justify-center rounded text-primary transition hover:bg-primary/15 hover:cursor-pointer"
                :aria-label="`Remove ${audienceLabel(entry)}`"
                @click="removeAudience(entry)"
              >
                <svg
                  class="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          </div>

          <p v-if="errors.audience" class="text-sm text-red-600">{{ errors.audience }}</p>
        </div>

        <!-- Expiry -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-black">
            {{ t('document.documentUploadModal.expiresLabel') }} <span class="text-red-500">*</span>
          </label>

          <!-- Quick presets — horizontally scrollable -->
          <div class="flex gap-2 overflow-x-auto scrollbar-hide">
            <!-- Reveal the custom date picker -->
            <ChipButton :active="showCustomDate" @click="toggleCustomDate()">+</ChipButton>
            <ChipButton :active="!form.expires_at && !showCustomDate" @click="chooseNever">
              {{ t('document.documentUploadModal.expiresNever') }}
            </ChipButton>
            <ChipButton
              v-for="preset in expiryPresets"
              :key="preset.key"
              :active="isPresetActive(preset.days)"
              @click="setExpiryInDays(preset.days)"
            >
              {{ t(`document.documentUploadModal.${preset.key}`) }}
            </ChipButton>
          </div>

          <DateField
            v-if="showCustomDate"
            v-model="form.expires_at"
            :min="todayStr"
            @update:model-value="onExpiryDateChange"
          />

          <p v-if="errors.expires_at" class="text-sm text-red-600">{{ errors.expires_at }}</p>

          <p v-if="expirySummary" class="text-xs text-primary">
            {{ t('document.documentUploadModal.expiresSummary', { date: expirySummary }) }}
          </p>
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-black">
            {{ t('document.documentUploadModal.descriptionLabel') }}
          </label>
          <textarea
            v-model="form.description"
            rows="3"
            maxlength="500"
            :placeholder="t('document.documentUploadModal.descriptionPlaceholder')"
            class="w-full resize-y rounded-xl border border-[#D9D9D9] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#0057BD]"
          />
          <p class="text-right text-xs text-gray-400">{{ form.description.length }}/500</p>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            @click="submit"
            :disabled="docs.loading || isStaging"
            class="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#006B9C] disabled:cursor-not-allowed disabled:opacity-60 hover:cursor-pointer"
          >
            <span v-if="docs.loading" class="flex items-center gap-2">
              <RingSpinner :size="16" :stroke="2.5" />
              {{ t('document.documentUploadModal.uploading') }}
            </span>
            <span v-else>{{ t('document.documentUploadModal.uploadButton') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Name popup for the hovered attachment. Teleported so no scroll box or
       overflow rule can clip it; positioned against the tile it belongs to. -->
  <Teleport to="body">
    <p
      v-if="hoveredName"
      class="pointer-events-none fixed z-[60] max-w-[240px] -translate-x-1/2 truncate rounded-full bg-[#E6F4F8] px-3 py-1.5 text-center text-[11px] font-medium text-primary shadow-sm"
      :style="{ left: `${hoveredAt.left}px`, top: `${hoveredAt.top}px` }"
    >
      {{ hoveredName }}
    </p>
  </Teleport>
</template>
