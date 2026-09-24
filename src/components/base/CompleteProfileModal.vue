<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import { useMajorsStore } from '@/stores/majors.store'
import { useCompleteProfile } from '@/composables/useCompleteProfile'
import { isFoundationMajor, yearLevelsForMajor } from '@/utils/format'
import RingSpinner from '@/components/base/RingSpinner.vue'
import SelectDropdown from '@/components/base/SelectDropdown.vue'

/**
 * Asks for the department and year that sign-up no longer collects.
 *
 * Those two fields are what `canView` matches an upload's audience against, so
 * until they're set a student only sees unrestricted documents. This prompts
 * for them at the moment that starts to matter — opening the documents pages —
 * rather than leaving them to discover a half-empty feed.
 *
 * Render it behind a v-if; it teleports itself above everything else.
 */
const emit = defineEmits<{ (e: 'saved'): void; (e: 'dismiss'): void }>()

const { t } = useI18n({ useScope: 'global' })
const auth = useAuthStore()
const majorsStore = useMajorsStore()
// Finishing Foundation is a different message from never having filled this in:
// one is "you've moved on", the other is "we never asked".
const { needsPromotion } = useCompleteProfile()

const form = reactive({ major_id: '', year_level: '' })
const errors = reactive({ major_id: '', year_level: '' })

const majorOptions = computed(() =>
  majorsStore.majors
    .filter((m) => {
      const acronym = String(m.acronym ?? '').toLowerCase()
      // DFL is a service department nobody registers into — every student takes
      // its courses alongside their own major.
      if (acronym === 'dfl') return false
      // Promotion means leaving the foundation programme, so offering it back
      // is a dead end. It stays listed for the other case this modal serves —
      // a year 1 student whose profile was never filled in.
      if (needsPromotion.value && isFoundationMajor(acronym)) return false
      return true
    })
    // Acronym, matching every other major picker in the app.
    .map((m) => ({ value: m.id, label: m.acronym })),
)
const selectedAcronym = computed(
  () => majorsStore.majors.find((m) => m.id === form.major_id)?.acronym,
)

// yearLevelsForMajor, not a local [1,2]/[3,4,5]: the same rule decides what the
// backend accepts, and a private copy here is how TC ended up offering years 3–5.
const yearOptions = computed(() =>
  yearLevelsForMajor(selectedAcronym.value).map((y) => ({
    value: String(y),
    label: t('auth.register.yearN', { year: y }),
  })),
)

/**
 * Finishing the foundation programme puts you in the FIRST year of whichever
 * department you joined — year 3 everywhere. So there is nothing to ask: the
 * year follows from the department, and the field is hidden.
 *
 * Taken from yearLevelsForMajor rather than hardcoding 3, so it stays right if
 * a department ever starts somewhere else.
 */
const promotedYear = computed(() => yearLevelsForMajor(selectedAcronym.value)[0])

watch(
  () => form.major_id,
  () => {
    form.year_level = ''
  },
)

onMounted(() => majorsStore.fetchMajors())

async function submit() {
  errors.major_id = form.major_id ? '' : 'auth.register.enterDepartment'
  // Only asked when the year isn't already implied by the move out of foundation.
  errors.year_level = needsPromotion.value || form.year_level ? '' : 'auth.register.enterYear'
  if (errors.major_id || errors.year_level) return

  try {
    await auth.updateMe({
      major_id: form.major_id,
      year_level: needsPromotion.value ? promotedYear.value : Number(form.year_level),
    })
    emit('saved')
  } catch {
    // auth.error is shown in the banner
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 py-6">
      <div
        class="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/10"
      >
        <div
          class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
        >
          <!-- Finishing foundation is an achievement, so the promotion prompt
               congratulates rather than just asking. The other case this modal
               serves is an unfilled profile, which is not one. -->
          <!-- Party popper: cone, streamer trail, and confetti dots. The dots
               are zero-length segments, so they need round caps to render. -->
          <svg
            v-if="needsPromotion"
            class="h-8 w-8"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M5.8 11.3 2 22l10.7-3.79" />
            <path d="M4 3h.01" />
            <path d="M22 8h.01" />
            <path d="M15 2h.01" />
            <path d="M22 20h.01" />
            <path
              d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"
            />
            <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17" />
            <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7" />
            <path
              d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"
            />
          </svg>
          <svg
            v-else
            class="h-8 w-8"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.42A12 12 0 0118 15.29 12 12 0 0112 21a12 12 0 01-6.16-5.71A12 12 0 015.84 10.58L12 14z"
            />
          </svg>
        </div>

        <h2 class="mt-4 text-center text-xl font-bold text-gray-900">
          {{
            needsPromotion
              ? t('common.completeProfile.promotionTitle')
              : t('common.completeProfile.title')
          }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-500">
          {{
            needsPromotion
              ? t('common.completeProfile.promotionMessage')
              : t('common.completeProfile.message')
          }}
        </p>

        <div v-if="auth.error" class="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <p class="text-center text-sm text-red-600">{{ auth.error }}</p>
        </div>

        <div class="mt-5">
          <label class="text-sm font-semibold text-gray-600">
            {{ t('auth.register.department') }}
          </label>
          <div class="mt-1.5">
            <SelectDropdown
              v-model="form.major_id"
              :placeholder="t('auth.register.chooseDepartment')"
              :options="majorOptions"
            />
          </div>
          <p v-if="errors.major_id" class="mt-1.5 text-sm text-red-500">{{ t(errors.major_id) }}</p>
        </div>

        <!-- Hidden on promotion: leaving foundation means year 3, so there is
             nothing to choose. See promotedYear. -->
        <div v-if="!needsPromotion" class="mt-4">
          <label class="text-sm font-semibold text-gray-600">{{ t('auth.register.year') }}</label>
          <div class="mt-1.5">
            <SelectDropdown
              v-model="form.year_level"
              :placeholder="t('auth.register.chooseYear')"
              :options="yearOptions"
              :disabled="!form.major_id"
            />
          </div>
          <p v-if="errors.year_level" class="mt-1.5 text-sm text-red-500">
            {{ t(errors.year_level) }}
          </p>
        </div>

        <!-- Both paths through this modal are one-shot: once a department and
             year are stored, PATCH /users/me refuses to change them and only an
             admin can correct a mistake. Say so before they commit. -->
        <div class="mt-2 flex items-center gap-1 rounded-xl">
          <!-- Solid disc with the mark punched out (fill-rule evenodd), so the
               exclamation reads white against the amber panel. -->
          <svg
            class="mt-0.5 h-6 w-6 shrink-0 text-amber-400"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
            />
          </svg>
          <p class="text-xs leading-relaxed text-amber-400">
            {{ t('common.completeProfile.warning') }}
          </p>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-black transition hover:bg-gray-200 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="auth.loading"
            @click="emit('dismiss')"
          >
            {{ t('common.completeProfile.later') }}
          </button>
          <button
            type="button"
            class="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="auth.loading"
            @click="submit"
          >
            <RingSpinner v-if="auth.loading" :size="16" :stroke="3" />
            {{ t('common.completeProfile.save') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
