<script setup lang="ts">
import { computed, onMounted, reactive, ref, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import { useMajorsStore } from '@/stores/majors.store'
import { checkName } from '@/utils/format'
import IconTextButton from '@/components/base/IconTextButton.vue'
import ImageLightbox from '@/components/base/ImageLightbox.vue'
import TelegramNotificationsCard from '@/components/profile/TelegramNotificationsCard.vue'

const { t } = useI18n({ useScope: 'global' })
const auth = useAuthStore()
const majorsStore = useMajorsStore()

const form = reactive({
  first_name: '',
  last_name: '',
})
const errors = reactive({ first_name: '', last_name: '' })
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
  () =>
    editing.value && !removeAvatar.value && Boolean(avatarPreview.value || auth.user?.avatar_url),
)

const showFullImage = ref(false)
function openFullImage() {
  if (displayAvatar.value) showFullImage.value = true
}
const initials = computed(
  () => `${form.first_name?.[0] ?? ''}${form.last_name?.[0] ?? ''}`.toUpperCase() || '?',
)

/**
 * Department and year are shown here but not editable.
 *
 * They decide which documents a student can see, so letting anyone retype them
 * would make the audience restriction meaningless. They are set once by the
 * complete-profile prompt and then maintained by the July rollover.
 */
const selectedMajor = computed(() => majorsStore.majors.find((m) => m.id === auth.user?.major_id))
const yearLabel = computed(() =>
  auth.user?.year_level ? t('auth.register.yearN', { year: auth.user.year_level }) : '—',
)

function syncFromUser() {
  form.first_name = auth.user?.first_name?.trim() ?? ''
  form.last_name = auth.user?.last_name?.trim() ?? ''
}

onMounted(async () => {
  await majorsStore.fetchMajors()
  if (!auth.user) await auth.fetchMe()
  syncFromUser()
})

onBeforeUnmount(() => {
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

// The rule is shared with registration rather than restated — see checkName.
const NAME_PROBLEM_KEYS = {
  spaces: 'common.profilePage.errorNameNoSpace',
  invalid: 'common.profilePage.errorNameInvalid',
  lowercase: 'common.profilePage.errorNameCapital',
} as const
const NAME_MAX = 50

// Store i18n KEYS (not translated text) so messages re-translate on language switch.
function validateName(field: 'first_name' | 'last_name') {
  const value = form[field].trim()
  const requiredKey =
    field === 'first_name'
      ? 'common.profilePage.errorFirstName'
      : 'common.profilePage.errorLastName'
  if (!value) {
    errors[field] = requiredKey
  } else if (value.length > NAME_MAX) {
    errors[field] = 'common.profilePage.errorNameTooLong'
  } else {
    const problem = checkName(value)
    errors[field] = problem ? NAME_PROBLEM_KEYS[problem] : ''
  }
}

function validate() {
  validateName('first_name')
  validateName('last_name')
  return !errors.first_name && !errors.last_name
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
  <!-- Scrolls inside the card rather than growing the page: the column is a
       fixed height on this route (see DashboardView's FILLS_COLUMN), so the
       form stays level with the sidebar. min-h-0 because a flex child will not
       shrink below its content without it, which would defeat the overflow.
       py-1 is not cosmetic: a scroll container clips at its padding box, and
       the avatar's ring-4 is drawn 4px OUTSIDE its box — with no padding the
       ring's top arc is cut off and the circle reads as flattened. -->
  <div class="mx-auto w-full max-w-4xl min-h-0 flex-1 overflow-y-auto px-6 py-1 scrollbar-primary">
    <!-- Header: avatar + name + update button -->
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-5">
        <div class="relative shrink-0">
          <div
            class="md:h-28 md:w-28 h-15 w-15 rounded-full ring-4 ring-gray-100 overflow-hidden bg-primary/10 flex items-center justify-center"
            :class="displayAvatar ? 'cursor-pointer' : ''"
            @click="openFullImage"
          >
            <!-- no-referrer: Google profile photos are refused when a Referer
                 is sent. Not UserAvatar, because this also shows the local
                 preview of a not-yet-uploaded file. -->
            <img
              v-if="displayAvatar"
              :src="displayAvatar"
              alt=""
              referrerpolicy="no-referrer"
              class="h-full w-full object-cover"
            />
            <span v-else class="md:text-3xl text-xl font-bold text-primary">{{ initials }}</span>
          </div>
          <button
            v-if="editing"
            type="button"
            @click="pickPhoto"
            class="absolute bottom-0 right-0 md:h-8 md:w-8 h-6 w-6 rounded-full bg-white ring-2 ring-white shadow-md flex items-center justify-center text-primary hover:bg-gray-50 cursor-pointer"
            :aria-label="t('common.profilePage.updateProfile')"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            @change="onPhotoChange"
          />
        </div>

        <div>
          <h1 class="md:text-3xl text-xl font-bold text-gray-900">
            {{ `${form.first_name} ${form.last_name}`.trim() || auth.fullName || '—' }}
          </h1>
          <p class="mt-1 text-xs md:text-sm text-gray-400">
            <template v-if="selectedMajor && auth.user?.year_level">
              {{ yearLabel }} • {{ selectedMajor.acronym }}
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
      <IconTextButton
        v-if="!editing"
        :text="t('common.profilePage.updateProfile')"
        @click="startEdit"
      >
        <template #icon>
          <svg class="md:h-4 md:w-4 h-3 w-3" fill="currentColor" viewBox="0 0 640 640">
            <path
              d="M535.6 85.7C513.7 63.8 478.3 63.8 456.4 85.7L432 110.1L529.9 208L554.3 183.6C576.2 161.7 576.2 126.3 554.3 104.4L535.6 85.7zM236.4 305.7C230.3 311.8 225.6 319.3 222.9 327.6L193.3 416.4C190.4 425 192.7 434.5 199.1 441C205.5 447.5 215 449.7 223.7 446.8L312.5 417.2C320.7 414.5 328.2 409.8 334.4 403.7L496 241.9L398.1 144L236.4 305.7zM160 128C107 128 64 171 64 224L64 480C64 533 107 576 160 576L416 576C469 576 512 533 512 480L512 384C512 366.3 497.7 352 480 352C462.3 352 448 366.3 448 384L448 480C448 497.7 433.7 512 416 512L160 512C142.3 512 128 497.7 128 480L128 224C128 206.3 142.3 192 160 192L256 192C273.7 192 288 177.7 288 160C288 142.3 273.7 128 256 128L160 128z"
            />
          </svg>
        </template>
      </IconTextButton>
    </div>

    <!-- Form -->
    <div class="mt-10 flex flex-col gap-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label class="text-sm font-semibold text-gray-600">{{
            t('common.profilePage.firstName')
          }}</label>
          <input
            v-model="form.first_name"
            type="text"
            :disabled="!editing"
            @blur="validateName('first_name')"
            class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
          />
          <p v-if="errors.first_name" class="mt-1 text-sm text-red-500">
            {{ t(errors.first_name, { max: NAME_MAX }) }}
          </p>
        </div>
        <div>
          <label class="text-sm font-semibold text-gray-600">{{
            t('common.profilePage.lastName')
          }}</label>
          <input
            v-model="form.last_name"
            type="text"
            :disabled="!editing"
            @blur="validateName('last_name')"
            class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
          />
          <p v-if="errors.last_name" class="mt-1 text-sm text-red-500">
            {{ t(errors.last_name, { max: NAME_MAX }) }}
          </p>
        </div>
      </div>

      <!-- Email (read-only) -->
      <div>
        <label class="text-sm font-semibold text-gray-600">{{
          t('common.profilePage.email')
        }}</label>
        <input
          :value="auth.user?.email ?? ''"
          type="text"
          readonly
          class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-gray-500 cursor-not-allowed focus:outline-none"
        />
      </div>

      <!-- Read-only, like Email: these decide which documents you can see, so
           they are set by the complete-profile prompt and moved on by the July
           rollover — never retyped here. -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label class="text-sm font-semibold text-gray-600">{{
            t('common.profilePage.department')
          }}</label>
          <input
            :value="selectedMajor?.acronym ?? '—'"
            type="text"
            disabled
            class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-gray-500 cursor-not-allowed focus:outline-none"
          />
        </div>
        <div>
          <label class="text-sm font-semibold text-gray-600">{{
            t('common.profilePage.academicYear')
          }}</label>
          <input
            :value="yearLabel"
            type="text"
            disabled
            class="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-gray-500 cursor-not-allowed focus:outline-none"
          />
        </div>

        <!-- Only while editing: on the locked form every field is greyed out,
             so singling these two out would say nothing. In edit mode the rest
             come alive and these do not, which is when the reason is wanted. -->
        <div v-if="editing" class="md:col-span-2 flex items-center gap-1.5">
          <svg
            class="h-5 w-5 shrink-0 text-primary"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
            />
          </svg>
          <p class="text-xs leading-relaxed text-gray-500">
            {{ t('common.profilePage.departmentLocked') }}
          </p>
        </div>
      </div>

      <!-- Feedback + save. Only mounted when there is something to show: on a
           locked form none of its children can render, and an empty row still
           cost its min-height plus the column gap either side of it. -->
      <div
        v-if="editing || auth.error || saved"
        class="flex items-center justify-end gap-4 min-h-10"
      >
        <p v-if="auth.error" class="text-sm text-red-500">{{ auth.error }}</p>
        <p v-else-if="saved" class="text-sm text-green-600">{{ t('common.profilePage.saved') }}</p>
        <!-- Only while editing: there is nothing to cancel on a locked form,
             and `v-else` alone showed it whenever no message was on screen. -->
        <button
          v-else-if="editing"
          type="button"
          @click="cancelEdit"
          :disabled="auth.loading"
          class="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer sm:px-4 sm:py-2.5 sm:text-sm"
        >
          {{ t('common.profilePage.cancel') }}
        </button>
        <button
          v-if="editing"
          @click="save"
          :disabled="auth.loading"
          class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer sm:px-6 sm:py-2.5 sm:text-sm"
        >
          {{ auth.loading ? t('common.profilePage.saving') : t('common.profilePage.save') }}
        </button>
      </div>
    </div>
    <!-- Delivery settings, below the account fields: it is about where
         notifications go, not who you are, and it saves itself. -->
    <TelegramNotificationsCard class="!mt-6" />
  </div>

  <!-- Fullscreen avatar viewer -->
  <ImageLightbox v-model="showFullImage" :src="displayAvatar" alt="" />
</template>
