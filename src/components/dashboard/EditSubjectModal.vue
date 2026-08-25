<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import RingSpinner from '@/components/common/RingSpinner.vue'

/**
 * Edits a subject's name, acronym and semester. Validation mirrors the API's
 * rules so the error arrives before the request does.
 */
const props = defineProps<{
  subject: { id: string; name: string; acronym?: string; semester?: string | number }
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: { name: string; acronym: string; semester: string }): void
}>()

// Name: letters/numbers/spaces/hyphens in any language. Acronym: no lowercase.
const NAME_PATTERN = /^(?=.*[\p{L}\p{N}])[\p{L}\p{M}\p{N}\s-]+$/u
const ACRONYM_PATTERN = /^(?!.*\p{Ll})[\p{L}\p{M}\p{N}]+$/u

const name = ref(props.subject.name)
const acronym = ref(props.subject.acronym ?? '')
const semester = ref(String(props.subject.semester ?? ''))
const errors = ref({ name: '', acronym: '' })

const canSubmit = computed(() => name.value.trim() && acronym.value.trim() && !props.saving)

function validate(): boolean {
  const trimmedName = name.value.trim()
  const trimmedAcronym = acronym.value.trim()

  errors.value.name = !trimmedName
    ? 'Please enter subject name'
    : trimmedName.length > 20
      ? 'You can only enter up to 20 characters'
      : !NAME_PATTERN.test(trimmedName)
        ? 'Subject name must not contain special characters'
        : ''

  errors.value.acronym = !trimmedAcronym
    ? 'Please enter an acronym'
    : trimmedAcronym.length > 10
      ? 'You can only enter up to 10 characters'
      : !ACRONYM_PATTERN.test(trimmedAcronym)
        ? 'Acronym can only contain letters and numbers, with no lowercase'
        : ''

  return !errors.value.name && !errors.value.acronym
}

function submit() {
  if (!validate()) return
  emit('save', {
    name: name.value.trim(),
    acronym: acronym.value.trim(),
    semester: semester.value,
  })
}

function onKeydown(event: KeyboardEvent) {
  if (props.saving) return
  if (event.key === 'Escape') emit('close')
  if (event.key === 'Enter') submit()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

const INPUT_CLASS =
  'rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
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
          <p class="text-center text-xl font-bold text-black">Edit Subject</p>
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
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-gray-600">Name</label>
            <input v-model="name" :class="INPUT_CLASS" @blur="validate" />
            <p v-if="errors.name" class="text-xs text-red-600">{{ errors.name }}</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-gray-600">Acronym</label>
            <input v-model="acronym" :class="INPUT_CLASS" @blur="validate" />
            <p v-if="errors.acronym" class="text-xs text-red-600">{{ errors.acronym }}</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-gray-600">Semester</label>
            <select v-model="semester" :class="[INPUT_CLASS, 'hover:cursor-pointer']">
              <option value="">—</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
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
            Save
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
