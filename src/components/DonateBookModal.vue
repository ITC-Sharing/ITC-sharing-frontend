<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useBooksStore } from '@/stores/books.store'
import { useMajorsStore } from '@/stores/majors.store'
import SelectDropdown from '@/components/SelectDropdown.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { TEXT_NAME_PATTERN, FORBIDDEN_TEXT_PATTERN } from '@/utils/format'

const { t } = useI18n({ useScope: 'global' })
const auth = useAuthStore()
const books = useBooksStore()
const majors = useMajorsStore()

const props = defineProps<{
  editBook?: {
    id: string
    title: string
    description?: string | null
    contact?: string | null
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
  department: props.editBook?.majors?.id ?? auth.user?.majors?.id ?? '',
  description: props.editBook?.description ?? '',
  contact: props.editBook?.contact ?? '',
})

const errors = reactive({
  title: '',
  department: '',
  description: '',
  contact: '',
  cover: '',
})

const majorOptions = computed(() => majors.majors.map((m) => ({ value: m.id, label: m.acronym })))

function onCoverChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  coverFile.value = file
  coverPreview.value = URL.createObjectURL(file)
}

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

function validateContact() {
  const contact = form.contact.trim()
  if (!contact) {
    errors.contact = t('common.donateBookModal.errorContactRequired')
  } else if (FORBIDDEN_TEXT_PATTERN.test(contact)) {
    errors.contact = t('common.donateBookModal.errorContactInvalid')
  } else {
    errors.contact = ''
  }
}

function validateDescription() {
  errors.description = FORBIDDEN_TEXT_PATTERN.test(form.description)
    ? t('common.donateBookModal.errorDescriptionInvalid')
    : ''
}

function validate() {
  validateTitle()
  validateContact()
  validateDescription()
  errors.department = form.department ? '' : t('common.donateBookModal.errorDepartmentRequired')
  errors.cover =
    !isEditing.value && !coverFile.value ? t('common.donateBookModal.errorCoverRequired') : ''
  return (
    !errors.title && !errors.department && !errors.description && !errors.contact && !errors.cover
  )
}

async function submit() {
  if (!validate()) return
  uploading.value = true
  try {
    let cover_image_url: string | undefined
    if (coverFile.value) {
      cover_image_url = await books.uploadCover(coverFile.value)
    }
    const payload = {
      title: form.title.trim(),
      department: form.department,
      description: form.description.trim() || undefined,
      contact: form.contact.trim(),
      cover_image_url,
    }
    if (isEditing.value) {
      await books.update(props.editBook!.id, payload)
      emit('updated')
    } else {
      await books.donate(payload)
      emit('donated')
    }
    emit('close')
  } catch {
    // books.error is set by store
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <div
      class="flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 md:max-w-md"
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
      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
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
          <div v-if="coverPreview" class="relative w-fit">
            <img :src="coverPreview" class="h-32 w-24 rounded-xl object-cover shadow" />
            <button
              type="button"
              @click="removeCover"
              class="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
            >
              ✕
            </button>
          </div>
          <label
            v-else
            class="flex h-23 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D3D3D3] bg-[#FAFAFA] text-sm text-gray-400 transition hover:border-[#008CB9] hover:bg-[#F3FBFF]"
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
            class="w-full rounded-xl border border-[#D9D9D9] px-4 py-2.5 text-sm outline-none transition focus:border-[#008CB9]"
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
            <span class="font-normal text-gray-400">{{
              t('common.donateBookModal.optional')
            }}</span></label
          >

          <textarea
            v-model="form.description"
            rows="3"
            :placeholder="t('common.donateBookModal.descriptionPlaceholder')"
            @blur="validateDescription"
            @input="errors.description = ''"
            class="w-full rounded-xl border border-[#D9D9D9] px-4 py-2.5 text-sm outline-none transition focus:border-[#008CB9] resize-none"
            :class="errors.description ? 'border-red-400' : ''"
          />
          <p v-if="errors.description" class="text-xs text-red-500">{{ errors.description }}</p>
        </div>

        <!-- Contact -->
        <div class="space-y-1">
          <label class="text-sm font-medium text-black"
            >{{ t('common.donateBookModal.contactLabel') }}
            <span class="text-red-500">*</span></label
          >
          <input
            v-model="form.contact"
            type="text"
            :placeholder="t('common.donateBookModal.contactPlaceholder')"
            @blur="validateContact"
            @input="errors.contact = ''"
            class="w-full rounded-xl border border-[#D9D9D9] px-4 py-2.5 text-sm outline-none transition focus:border-[#008CB9]"
            :class="errors.contact ? 'border-red-400' : ''"
          />
          <p v-if="errors.contact" class="text-xs text-red-500">{{ errors.contact }}</p>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            :disabled="uploading"
            @click="emit('close')"
            class="rounded-xl border border-[#D0D0D0] px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#F4F4F4] disabled:opacity-50"
          >
            {{ t('common.donateBookModal.cancel') }}
          </button>
          <button
            type="button"
            :disabled="uploading"
            @click="submit"
            class="rounded-xl bg-[#008CB9] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#006B9C] disabled:opacity-60"
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
</template>
