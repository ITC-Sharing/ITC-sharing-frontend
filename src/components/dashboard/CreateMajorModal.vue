<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import api from '@/lib/axios'
import RingSpinner from '@/components/common/RingSpinner.vue'

/**
 * Creates a department, or edits one when `major` is passed. Sent as multipart
 * when a logo is picked, since the API takes the image on the same request.
 */
const props = defineProps<{
  major?: { id: string; name: string; acronym: string; image_url: string | null } | null
}>()

const emit = defineEmits<{ (e: 'close'): void; (e: 'created'): void }>()

const isEditing = computed(() => !!props.major)

// Mirrors the API's rules so the error arrives before the request does.
const NAME_PATTERN = /^(?=.*[\p{L}\p{N}])[\p{L}\p{M}\p{N}\s-]+$/u
const ACRONYM_PATTERN = /^[A-Z0-9]+$/

const name = ref(props.major?.name ?? '')
const acronym = ref(props.major?.acronym ?? '')
const logo = ref<File | null>(null)
// The existing logo shows in the same slot; picking a file replaces it.
const logoPreview = ref<string | null>(props.major?.image_url ?? null)
const saving = ref(false)
const errors = ref({ name: '', acronym: '', form: '' })

// Department pages are routed by the lowercased acronym, so it's uppercase-only.
const onAcronymInput = (event: Event) => {
  acronym.value = (event.target as HTMLInputElement).value.toUpperCase()
  errors.value.acronym = ''
}

const canSubmit = computed(() => name.value.trim() && acronym.value.trim() && !saving.value)

function pickLogo(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  if (!file) return
  if (logoPreview.value) URL.revokeObjectURL(logoPreview.value)
  logo.value = file
  logoPreview.value = URL.createObjectURL(file)
}

function clearLogo() {
  if (logo.value && logoPreview.value) URL.revokeObjectURL(logoPreview.value)
  logo.value = null
  logoPreview.value = null
}

function validate() {
  const trimmedName = name.value.trim()
  const trimmedAcronym = acronym.value.trim()

  errors.value.name = !trimmedName
    ? 'Department name is required'
    : trimmedName.length > 100
      ? 'Name must be 100 characters or fewer'
      : !NAME_PATTERN.test(trimmedName)
        ? 'Name must not contain special characters'
        : ''

  errors.value.acronym = !trimmedAcronym
    ? 'Acronym is required'
    : trimmedAcronym.length > 10
      ? 'Acronym must be 10 characters or fewer'
      : !ACRONYM_PATTERN.test(trimmedAcronym)
        ? 'Acronym must be uppercase letters and numbers only'
        : ''

  return !errors.value.name && !errors.value.acronym
}

async function submit() {
  if (!validate()) return
  saving.value = true
  errors.value.form = ''
  try {
    const body = new FormData()
    body.append('name', name.value.trim())
    body.append('acronym', acronym.value.trim())
    if (logo.value) body.append('image', logo.value)

    const headers = { 'Content-Type': 'multipart/form-data' }
    if (props.major) await api.patch(`/majors/${props.major.id}`, body, { headers })
    else await api.post('/majors', body, { headers })
    emit('created')
  } catch (e: unknown) {
    const message = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
      ?.message
    errors.value.form = Array.isArray(message)
      ? message.join(', ')
      : (message ?? `Failed to ${isEditing.value ? 'update' : 'create'} department`)
  } finally {
    saving.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !saving.value) emit('close')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  if (logo.value && logoPreview.value) URL.revokeObjectURL(logoPreview.value)
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm"
      @click.self="!saving && emit('close')"
    >
      <div
        class="flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 md:max-w-md"
      >
        <div class="relative border-b border-black/5 px-5 py-4">
          <p class="text-center text-xl font-bold text-black">
            {{ isEditing ? 'Edit Department' : 'New Department' }}
          </p>
          <button
            type="button"
            class="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-primary/10 hover:text-primary hover:cursor-pointer"
            aria-label="Close"
            :disabled="saving"
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

        <div class="min-h-0 flex-1 space-y-4 overflow-y-auto scrollbar-hide px-5 py-4">
          <p v-if="errors.form" class="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {{ errors.form }}
          </p>

          <!-- Logo -->
          <div class="flex items-center gap-4">
            <div
              class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E5E7EB] bg-gray-50"
            >
              <img
                v-if="logoPreview"
                :src="logoPreview"
                alt=""
                class="h-full w-full object-contain"
              />
              <span v-else class="text-xs font-bold text-gray-300">{{ acronym || 'LOGO' }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <label
                class="cursor-pointer rounded-xl border border-[#D9D9D9] px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-primary hover:text-primary"
              >
                <input
                  type="file"
                  class="hidden"
                  accept="image/png,image/jpeg,image/webp"
                  @change="pickLogo"
                />
                {{ logo ? 'Change logo' : 'Upload logo' }}
              </label>
              <button
                v-if="logo"
                type="button"
                class="text-left text-xs text-gray-400 transition hover:text-red-500 hover:cursor-pointer"
                @click="clearLogo"
              >
                Remove
              </button>
              <p v-else class="text-[11px] text-gray-400">PNG, JPEG or WebP — optional</p>
            </div>
          </div>

          <!-- Name -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-black">
              Department name <span class="text-red-500">*</span>
            </label>
            <input
              v-model="name"
              type="text"
              maxlength="100"
              placeholder="e.g. Department of Civil Engineering"
              class="w-full rounded-xl border border-[#D9D9D9] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary"
              :class="errors.name ? 'border-red-400' : ''"
              @input="errors.name = ''"
            />
            <p v-if="errors.name" class="text-sm text-red-600">{{ errors.name }}</p>
          </div>

          <!-- Acronym -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-black">
              Acronym <span class="text-red-500">*</span>
            </label>
            <input
              :value="acronym"
              type="text"
              maxlength="10"
              placeholder="e.g. GCI"
              class="w-full rounded-xl border border-[#D9D9D9] bg-white px-4 py-2.5 text-sm uppercase outline-none transition focus:border-primary"
              :class="errors.acronym ? 'border-red-400' : ''"
              @input="onAcronymInput"
            />
            <p v-if="errors.acronym" class="text-sm text-red-600">{{ errors.acronym }}</p>
            <!-- The acronym isn't cosmetic: it's the department's URL and the
                 label used across the app, and it can't be edited afterwards. -->
            <p v-else class="text-xs text-gray-400">
              Used as the page address — /dep/{{ (acronym || 'gci').toLowerCase() }}
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-black/5 px-5 py-4">
          <button
            type="button"
            class="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200 hover:cursor-pointer disabled:opacity-60"
            :disabled="saving"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#006B9C] hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!canSubmit"
            @click="submit"
          >
            <RingSpinner v-if="saving" :size="16" :stroke="2.5" />
            {{ isEditing ? 'Save' : 'Create' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
