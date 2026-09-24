<script setup lang="ts">
import { onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useBooksStore } from '@/stores/books.store'
import { useMajorsStore } from '@/stores/majors.store'
import SelectDropdown from '@/components/base/SelectDropdown.vue'
import ConfirmChangesModal, { type FieldChange } from '@/components/base/ConfirmChangesModal.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { TEXT_NAME_PATTERN, FORBIDDEN_TEXT_PATTERN } from '@/utils/format'
import { clearDraft, readDraft, writeDraft } from '@/composables/uploadDraft'

const { t } = useI18n({ useScope: 'global' })
const books = useBooksStore()
const majors = useMajorsStore()

const props = defineProps<{
  editBook?: {
    id: string
    title: string
    description?: string | null
    cover_image_url?: string | null
    majors?: { id: string } | null
  } | null
}>()

const emit = defineEmits<{ (e: 'close'): void; (e: 'donated'): void; (e: 'updated'): void }>()

const isEditing = computed(() => !!props.editBook)

majors.fetchMajors()

const coverFile = ref<File | null>(null)
const coverPreview = ref<string | null>(props.editBook?.cover_image_url ?? null)
const uploading = ref(false)

const form = reactive({
  title: props.editBook?.title ?? '',
  // '' is "nothing picked yet", which is what shows the placeholder. Choosing
  // None is a different thing and carries its own value — see NO_DEPARTMENT.
  department: props.editBook?.majors?.id ?? '',
  description: props.editBook?.description ?? '',
})

const errors = reactive({
  title: '',
  department: '',
  description: '',
  cover: '',
})

/**
 * "None" first and empty-valued: not every donated book is coursework, and
 * making people pick a department they do not mean is worse than none. The
 * empty string is what the API reads as "no department" — books.major_id is
 * nullable, and majors stays free of a placeholder row that would otherwise
 * show up in the profile and complete-profile pickers.
 */
/**
 * A value of its own, not '': the empty string means "not chosen yet" and is
 * what makes the dropdown show its placeholder. Deliberately picking None has
 * to be distinguishable from never having touched the field, so it carries a
 * sentinel that submit() maps back to '' for the API.
 */
const NO_DEPARTMENT = 'none'

const majorOptions = computed(() => [
  { value: NO_DEPARTMENT, label: t('common.donateBookModal.departmentNone') },
  ...majors.majors.map((m) => ({ value: m.id, label: m.acronym })),
])

function onCoverChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  coverFile.value = file
  coverPreview.value = URL.createObjectURL(file)
}

/**
 * The name shown on hover. A freshly picked file has one; an existing cover is
 * only a URL, so its filename is taken from the end of the path.
 */
const coverName = computed(
  () => coverFile.value?.name ?? coverPreview.value?.split('/').pop() ?? '',
)

function removeCover() {
  coverFile.value = null
  coverPreview.value = null
}

function validateTitle() {
  const title = form.title.trim()
  if (!title) {
    errors.title = t('common.donateBookModal.errorTitleRequired')
  } else if (!TEXT_NAME_PATTERN.test(title)) {
    errors.title = t('common.donateBookModal.errorTitleInvalid')
  } else {
    errors.title = ''
  }
}

function validateContact() {}

function validateDescription() {
  errors.description = FORBIDDEN_TEXT_PATTERN.test(form.description)
    ? t('common.donateBookModal.errorDescriptionInvalid')
    : ''
}

function validate() {
  validateTitle()
  validateContact()
  validateDescription()
  // Editing is checked too: removeCover() clears the preview, and a save from
  // there sent no cover_image_url at all, so the server quietly kept the old
  // image — the book looked unchanged and the delete appeared to do nothing.
  errors.cover =
    coverFile.value || coverPreview.value ? '' : t('common.donateBookModal.errorCoverRequired')
  return !errors.title && !errors.description && !errors.cover
}

/**
 * An edit is confirmed before it is saved, so an accidental change is caught
 * while it can still be undone. A new listing has nothing to compare against,
 * and an edit that changed nothing has nothing to confirm — both go straight
 * through.
 */
const pendingChanges = ref<FieldChange[]>([])

function departmentLabel(id: string) {
  if (!id || id === NO_DEPARTMENT) return t('common.donateBookModal.departmentNone')
  return majors.majors.find((m) => m.id === id)?.acronym ?? id
}

function collectChanges(): FieldChange[] {
  const book = props.editBook
  if (!book) return []
  const changes: FieldChange[] = []

  if (form.title.trim() !== book.title)
    changes.push({
      label: t('common.donateBookModal.titleLabel'),
      from: book.title,
      to: form.title.trim(),
    })

  const fromDept = departmentLabel(book.majors?.id ?? '')
  const toDept = departmentLabel(form.department)
  if (fromDept !== toDept)
    changes.push({
      label: t('common.donateBookModal.departmentLabel'),
      from: fromDept,
      to: toDept,
    })

  if (form.description.trim() !== (book.description ?? ''))
    changes.push({
      label: t('common.donateBookModal.descriptionLabel'),
      from: book.description ?? '',
      to: form.description.trim(),
    })

  // The image itself cannot be shown side by side here, so say that it changed.
  if (coverFile.value)
    changes.push({
      label: t('common.confirmChanges.coverImage'),
      from: book.cover_image_url ? (book.cover_image_url.split('/').pop() ?? '') : '',
      to: t('common.confirmChanges.coverReplaced'),
    })

  return changes
}

function submit() {
  if (!validate()) return
  if (isEditing.value) {
    const changes = collectChanges()
    if (changes.length) {
      pendingChanges.value = changes
      return
    }
  }
  void save()
}

async function save() {
  uploading.value = true
  try {
    let cover_image_url: string | undefined
    if (coverFile.value) {
      cover_image_url = await books.uploadCover(coverFile.value)
    }
    const payload = {
      title: form.title.trim(),
      // '' either way: the API reads an empty department as none at all.
      department: form.department === NO_DEPARTMENT ? '' : form.department,
      description: form.description.trim() || undefined,
      cover_image_url,
    }
    if (isEditing.value) {
      await books.update(props.editBook!.id, payload)
      emit('updated')
    } else {
      await books.donate(payload)
      emit('donated')
    }
    // Saved: there is nothing left to come back to.
    clearDraft(draftContext.value)
    pendingChanges.value = []
    emit('close')
  } catch {
    // books.error is set by store
  } finally {
    uploading.value = false
  }
}

// ── Draft ──────────────────────────────────────────────────────────────────
// Closing this form — deliberately or by a stray click on the backdrop — keeps
// what was typed, for this page session only. Keyed by the book being edited,
// so a new listing and an edit never overwrite each other.
const draftContext = computed(() => `book:${props.editBook?.id ?? 'new'}`)

type Draft = {
  form: Partial<typeof form>
  /** The File itself, not a URL: the draft is in memory, and keeping the file
   *  is what lets the preview be rebuilt from it. */
  coverFile: File | null
  /** Only for an existing cover, which is a server URL rather than a blob. */
  coverUrl: string | null
}

function saveDraft() {
  const blank = !form.title.trim() && !form.description.trim() && !coverFile.value
  if (blank && !isEditing.value) {
    clearDraft(draftContext.value)
    return
  }
  writeDraft(draftContext.value, {
    form: { ...form },
    coverFile: coverFile.value,
    coverUrl: coverFile.value ? null : coverPreview.value,
  } satisfies Draft)
}

/**
 * Restores what was typed, or gives up and starts clean. A bad draft must never
 * take the modal down with it: this runs during setup, and the draft outlives
 * the component, so the same throw would repeat on every reopen.
 */
function restoreDraft() {
  const draft = readDraft<Draft>(draftContext.value)
  if (!draft) return
  try {
    Object.assign(form, draft.form)
    coverFile.value = draft.coverFile
    // Rebuilt from the file: the previous object URL died with the last close.
    coverPreview.value = draft.coverFile ? URL.createObjectURL(draft.coverFile) : draft.coverUrl
  } catch (err) {
    console.error('Could not restore the book draft; starting a fresh form.', err)
    clearDraft(draftContext.value)
  }
}

// Saved as the user types, coalesced so a keystroke isn't a write.
let draftTimer: ReturnType<typeof setTimeout>
watch(
  [form, coverFile],
  () => {
    clearTimeout(draftTimer)
    draftTimer = setTimeout(saveDraft, 300)
  },
  { deep: true },
)

// Otherwise the debounced save fires ~300ms after the modal is gone.
onBeforeUnmount(() => clearTimeout(draftTimer))

// Last, deliberately: restoreDraft() assigns to refs declared above, and a
// `const` cannot be read before its own line has run.
restoreDraft()
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
    @click.self="emit('close')"
  >
    <div
      class="flex max-h-[80dvh] w-full max-w-sm flex-col sm:max-h-[90dvh] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 md:max-w-md"
    >
      <!-- Header -->
      <div class="border-b border-black/5 px-5 py-4">
        <p class="text-center text-xl font-bold text-black">
          {{
            isEditing
              ? t('common.donateBookModal.editTitle')
              : t('common.donateBookModal.createTitle')
          }}
        </p>
      </div>

      <!-- Body -->
      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 scrollbar-primary">
        <!-- Server error -->
        <p v-if="books.error" class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {{ books.error }}
        </p>

        <!-- Cover image -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-black"
            >{{ t('common.donateBookModal.coverLabel') }}
            <span v-if="!isEditing" class="text-red-500">*</span></label
          >
          <!-- Same tile as a staged file in the document upload: the picture
               fills a rounded square, and the remove button shows on hover — or
               on keyboard focus, so it stays reachable without a pointer. -->
          <div v-if="coverPreview" class="group relative w-fit">
            <div class="h-16 w-16 overflow-hidden rounded-2xl border border-[#E5E7EB]">
              <img :src="coverPreview" :alt="coverName" class="h-full w-full object-cover" />
            </div>
            <button
              type="button"
              class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-primary opacity-0 shadow-sm transition hover:cursor-pointer hover:bg-white group-hover:opacity-100 focus:opacity-100"
              :aria-label="`Remove ${coverName}`"
              @click="removeCover"
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
          </div>
          <label
            v-else
            class="flex h-23 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D3D3D3] bg-[#FAFAFA] text-sm text-gray-400 transition hover:border-primary hover:bg-[#F3FBFF]"
          >
            <input
              type="file"
              class="hidden"
              accept="image/jpeg,image/png,image/webp"
              @change="onCoverChange"
            />
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
            {{ t('common.donateBookModal.coverUpload') }}
          </label>
          <p v-if="errors.cover" class="text-xs text-red-500">{{ errors.cover }}</p>
        </div>

        <!-- Title -->
        <div class="space-y-1">
          <label class="text-sm font-medium text-black"
            >{{ t('common.donateBookModal.titleLabel') }} <span class="text-red-500">*</span></label
          >
          <input
            v-model="form.title"
            type="text"
            :placeholder="t('common.donateBookModal.titlePlaceholder')"
            @blur="validateTitle"
            @input="errors.title = form.title.trim() ? '' : errors.title"
            class="w-full rounded-xl border border-[#D9D9D9] px-4 py-2.5 text-sm outline-none transition focus:border-primary"
            :class="errors.title ? 'border-red-400' : ''"
          />
          <p v-if="errors.title" class="text-xs text-red-500">{{ errors.title }}</p>
        </div>

        <!-- Department -->
        <div class="space-y-1">
          <label class="text-sm font-medium text-black"
            >{{ t('common.donateBookModal.departmentLabel') }}
            <span class="text-red-500">*</span></label
          >
          <SelectDropdown
            v-model="form.department"
            :placeholder="t('common.donateBookModal.selectDepartment')"
            :options="majorOptions"
          />
          <p v-if="errors.department" class="text-xs text-red-500">{{ errors.department }}</p>
        </div>

        <!-- Description -->
        <div class="space-y-1">
          <label class="text-sm font-medium text-black"
            >{{ t('common.donateBookModal.descriptionLabel') }}
          </label>

          <textarea
            v-model="form.description"
            rows="3"
            :placeholder="t('common.donateBookModal.descriptionPlaceholder')"
            @blur="validateDescription"
            @input="errors.description = ''"
            class="w-full rounded-xl border border-[#D9D9D9] px-4 py-2.5 text-sm outline-none transition focus:border-primary resize-none"
            :class="errors.description ? 'border-red-400' : ''"
          />
          <p v-if="errors.description" class="text-xs text-red-500">{{ errors.description }}</p>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            :disabled="uploading"
            @click="emit('close')"
            class="rounded-xl border border-[#D0D0D0] px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#F4F4F4] disabled:opacity-50 cursor-pointer"
          >
            {{ t('common.donateBookModal.cancel') }}
          </button>
          <button
            type="button"
            :disabled="uploading"
            @click="submit"
            class="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60 cursor-pointer"
          >
            <span v-if="uploading" class="flex items-center gap-2">
              <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
              {{ t('common.donateBookModal.submitting') }}
            </span>
            <span v-else>{{
              isEditing
                ? t('common.donateBookModal.saveChanges')
                : t('common.donateBookModal.donateButton')
            }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <ConfirmChangesModal
    v-if="pendingChanges.length"
    :changes="pendingChanges"
    :loading="uploading"
    @cancel="pendingChanges = []"
    @confirm="save"
  />
</template>
