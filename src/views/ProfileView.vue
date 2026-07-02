<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import { useMajorsStore } from '@/stores/majors.store'

const { t } = useI18n({ useScope: 'global' })
const auth = useAuthStore()
const majorsStore = useMajorsStore()

const form = reactive({
  first_name: '',
  last_name: '',
  major_id: '',
  year_level: '',
})
const errors = reactive({ first_name: '', last_name: '', year_level: '' })
const saved = ref(false)
const editing = ref(false)

// Avatar — selected file kept locally, previewed, uploaded on save
const fileInput = ref<HTMLInputElement | null>(null)
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const removeAvatar = ref(false)

const displayAvatar = computed(() =>
  removeAvatar.value ? '' : (avatarPreview.value ?? auth.user?.avatar_url ?? ''),
)
const canRemoveAvatar = computed(
  () => editing.value && !removeAvatar.value && Boolean(avatarPreview.value || auth.user?.avatar_url),
)

const showFullImage = ref(false)
function openFullImage() {
  if (displayAvatar.value) showFullImage.value = true
}
function closeFullImage() {
  showFullImage.value = false
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeFullImage()
}
const initials = computed(() =>
  `${form.first_name?.[0] ?? ''}${form.last_name?.[0] ?? ''}`.toUpperCase() || '?',
)

// English & French are common courses every student takes, not selectable majors.
const HIDDEN_MAJORS = ['english', 'french']
const selectableMajors = computed(() =>
  majorsStore.majors.filter(
    (m) => !HIDDEN_MAJORS.includes(String(m.acronym ?? '').toLowerCase()),
  ),
)

const selectedMajor = computed(() => majorsStore.majors.find((m) => m.id === form.major_id))
const isFoundation = computed(() => selectedMajor.value?.acronym?.toLowerCase() === 'foundation')
const yearOptions = computed(() => (isFoundation.value ? [1, 2] : [3, 4, 5]))

function syncFromUser() {
  form.first_name = auth.user?.first_name?.trim() ?? ''
  form.last_name = auth.user?.last_name?.trim() ?? ''
  form.major_id = auth.user?.major_id ?? ''
  form.year_level = auth.user?.year_level ? String(auth.user.year_level) : ''
}

// Changing the department invalidates the previously chosen year range
watch(
  () => form.major_id,
  (next, prev) => {
    if (prev !== '' && next !== prev) form.year_level = ''
  },
)

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  await majorsStore.fetchMajors()
  if (!auth.user) await auth.fetchMe()
  syncFromUser()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (avatarPreview.value) URL.revokeObjectURL(avatarPreview.value)
})

function startEdit() {
  saved.value = false
  editing.value = true
}

function cancelEdit() {
  syncFromUser()
  errors.first_name = ''
  errors.last_name = ''
  errors.year_level = ''
  avatarFile.value = null
  removeAvatar.value = false
  if (avatarPreview.value) {
    URL.revokeObjectURL(avatarPreview.value)
    avatarPreview.value = null
  }
  auth.error = null
  editing.value = false
}

function pickPhoto() {
  if (!editing.value) return
  fileInput.value?.click()
}

function onPhotoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (avatarPreview.value) URL.revokeObjectURL(avatarPreview.value)
  avatarFile.value = file
  avatarPreview.value = URL.createObjectURL(file)
  removeAvatar.value = false
  saved.value = false
}

function removePhoto() {
  if (avatarPreview.value) {
    URL.revokeObjectURL(avatarPreview.value)
    avatarPreview.value = null
  }
  avatarFile.value = null
  removeAvatar.value = true
  saved.value = false
}

// Letters (Latin + Khmer) and spaces only — matches the registration rule.
const NAME_PATTERN = /^[A-Za-zក-៿\s]+$/
const NAME_MAX = 50

// Store i18n KEYS (not translated text) so messages re-translate on language switch.
function validateName(field: 'first_name' | 'last_name') {
  const value = form[field].trim()
  const requiredKey = field === 'first_name'
    ? 'common.profilePage.errorFirstName'
    : 'common.profilePage.errorLastName'
  if (!value) {
    errors[field] = requiredKey
  } else if (value.length > NAME_MAX) {
    errors[field] = 'common.profilePage.errorNameTooLong'
  } else if (!NAME_PATTERN.test(value)) {
    errors[field] = 'common.profilePage.errorNameInvalid'
  } else {
    errors[field] = ''
  }
}

function validateYear() {
  errors.year_level = form.year_level ? '' : 'common.profilePage.errorYear'
}

function validate() {
  validateName('first_name')
  validateName('last_name')
  validateYear()
  return !errors.first_name && !errors.last_name && !errors.year_level
}

async function save() {
  saved.value = false
  if (!validate()) return
  try {
    // Upload a new photo, clear it (null), or leave it untouched.
    let avatar_url: string | null | undefined
    if (avatarFile.value) avatar_url = await auth.uploadAvatar(avatarFile.value)
    else if (removeAvatar.value) avatar_url = null

    await auth.updateMe({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      major_id: form.major_id,
      year_level: Number(form.year_level),
      ...(avatar_url !== undefined ? { avatar_url } : {}),
    })

    avatarFile.value = null
    removeAvatar.value = false
    if (avatarPreview.value) {
      URL.revokeObjectURL(avatarPreview.value)
      avatarPreview.value = null
    }
    saved.value = true
    editing.value = false
  } catch {
    // auth.error shown below
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-6">
    <!-- Header: avatar + name + update button -->
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-5">
        <div class="relative">
          <div
            class="h-28 w-28 rounded-full ring-4 ring-gray-100 overflow-hidden bg-[#008CB9]/10 flex items-center justify-center"
            :class="displayAvatar ? 'cursor-pointer' : ''"
            @click="openFullImage"
          >
            <img v-if="displayAvatar" :src="displayAvatar" alt="" class="h-full w-full object-cover" />
            <span v-else class="text-3xl font-bold text-[#008CB9]">{{ initials }}</span>
          </div>
          <button
            v-if="editing"
            type="button"
            @click="pickPhoto"
            class="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-white ring-1 ring-gray-200 shadow flex items-center justify-center text-[#008CB9] hover:bg-gray-50 cursor-pointer"
            :aria-label="t('common.profilePage.updateProfile')"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onPhotoChange" />
        </div>

        <div>
          <h1 class="text-3xl font-bold text-gray-900">
            {{ `${form.first_name} ${form.last_name}`.trim() || auth.fullName || '—' }}
          </h1>
          <p class="mt-1 text-sm text-gray-400">
            <template v-if="selectedMajor && form.year_level">
              {{ selectedMajor.acronym }} • {{ t('auth.register.yearN', { year: form.year_level }) }}
            </template>
            <template v-else>—</template>
          </p>
          <button
            v-if="canRemoveAvatar"
            type="button"
            @click="removePhoto"
            class="mt-2 text-xs font-semibold text-red-500 hover:text-red-600 hover:underline"
          >
            {{ t('common.profilePage.removePhoto') }}
          </button>
        </div>
      </div>

      <!-- Edit (locked) ⇄ Cancel (while editing) -->
      <button
        v-if="!editing"
        type="button"
        @click="startEdit"
        class="flex items-center gap-2 rounded-xl bg-[#1f6f8b] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#185868] active:scale-95"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        {{ t('common.profilePage.updateProfile') }}
      </button>
      <button
        v-else
        type="button"
        @click="cancelEdit"
        :disabled="auth.loading"
        class="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ t('common.profilePage.cancel') }}
      </button>
    </div>

    <!-- Form -->
    <div class="mt-10 flex flex-col gap-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label class="text-sm font-semibold text-gray-600">{{ t('common.profilePage.firstName') }}</label>
          <input
            v-model="form.first_name"
            type="text"
            :disabled="!editing"
            @blur="validateName('first_name')"
            class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#008CB9] disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
          />
          <p v-if="errors.first_name" class="mt-1 text-sm text-red-500">
            {{ t(errors.first_name, { max: NAME_MAX }) }}
          </p>
        </div>
        <div>
          <label class="text-sm font-semibold text-gray-600">{{ t('common.profilePage.lastName') }}</label>
          <input
            v-model="form.last_name"
            type="text"
            :disabled="!editing"
            @blur="validateName('last_name')"
            class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#008CB9] disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
          />
          <p v-if="errors.last_name" class="mt-1 text-sm text-red-500">
            {{ t(errors.last_name, { max: NAME_MAX }) }}
          </p>
        </div>
      </div>

      <!-- Email (read-only) -->
      <div>
        <label class="text-sm font-semibold text-gray-600">{{ t('common.profilePage.email') }}</label>
        <input
          :value="auth.user?.email ?? ''"
          type="text"
          readonly
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-gray-500 cursor-not-allowed focus:outline-none"
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label class="text-sm font-semibold text-gray-600">{{ t('common.profilePage.department') }}</label>
          <select
            v-model="form.major_id"
            :disabled="!editing"
            class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#008CB9] disabled:bg-gray-100 disabled:cursor-not-allowed"
            :class="form.major_id === '' ? 'text-gray-400' : 'text-gray-900'"
          >
            <option disabled value="">{{ t('auth.register.chooseDepartment') }}</option>
            <option v-for="major in selectableMajors" :key="major.id" :value="major.id">
              {{ major.acronym }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-sm font-semibold text-gray-600">{{ t('common.profilePage.academicYear') }}</label>
          <select
            v-model="form.year_level"
            :disabled="!editing || !form.major_id"
            @change="validateYear"
            class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#008CB9] disabled:bg-gray-100 disabled:cursor-not-allowed"
            :class="form.year_level === '' ? 'text-gray-400' : 'text-gray-900'"
          >
            <option disabled value="">{{ t('auth.register.chooseYear') }}</option>
            <option v-for="y in yearOptions" :key="y" :value="String(y)">
              {{ t('auth.register.yearN', { year: y }) }}
            </option>
          </select>
          <p v-if="errors.year_level" class="mt-1 text-sm text-red-500">
            {{ t(errors.year_level) }}
          </p>
        </div>
      </div>

      <!-- Feedback + save -->
      <div class="flex items-center justify-end gap-4 min-h-10">
        <p v-if="auth.error" class="text-sm text-red-500">{{ auth.error }}</p>
        <p v-else-if="saved" class="text-sm text-green-600">{{ t('common.profilePage.saved') }}</p>
        <button
          v-if="editing"
          @click="save"
          :disabled="auth.loading"
          class="rounded-xl bg-[#1f6f8b] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#185868] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ auth.loading ? t('common.profilePage.saving') : t('common.profilePage.save') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Fullscreen avatar viewer -->
  <Teleport to="body">
    <div
      v-if="showFullImage"
      class="fixed inset-0 z-60 flex items-center justify-center bg-black/90"
      @click.self="closeFullImage"
    >
      <button
        class="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
        @click="closeFullImage"
        aria-label="Close"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        :src="displayAvatar"
        alt=""
        class="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain"
        @click.stop
      />
    </div>
  </Teleport>
</template>
