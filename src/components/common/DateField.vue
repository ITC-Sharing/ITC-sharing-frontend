<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

// A date input the user can either TYPE (dd/mm/yyyy, auto-formatted) or PICK
// via the calendar button. v-model is an ISO 'YYYY-MM-DD' string ('' = empty),
// so it slots straight into a date-backed form field.
const props = defineProps<{
  modelValue: string // 'YYYY-MM-DD' | ''
  min?: string // 'YYYY-MM-DD'
  placeholder?: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const text = ref('') // what's shown/typed: 'dd/mm/yyyy'
const error = ref('')
const dateInput = ref<HTMLInputElement | null>(null)

function isoToDisplay(iso: string): string {
  const [y, m, d] = (iso || '').split('-')
  return y && m && d ? `${d}/${m}/${y}` : ''
}

// Parse 'dd/mm/yyyy' → 'YYYY-MM-DD', or '' if incomplete/invalid (incl. real
// calendar checks like 31/02).
function displayToIso(s: string): string {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return ''
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  const dt = new Date(year, month - 1, day)
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(day)}`
}

// Sync in from the model only when it genuinely differs from what's typed, so a
// preset/clear updates the box but mid-typing an incomplete date isn't clobbered.
watch(
  () => props.modelValue,
  (v) => {
    if (displayToIso(text.value) !== v) text.value = isoToDisplay(v)
  },
  { immediate: true },
)

// Validate the digits typed so far. `final` (blur) also flags an incomplete
// date; while typing we only surface out-of-range day/month and a fully-typed
// but impossible date.
function validate(digits: string, final: boolean): string {
  if (digits.length >= 2) {
    const day = Number(digits.slice(0, 2))
    if (day < 1 || day > 31) return t('common.dateField.invalidDay')
  }
  if (digits.length >= 4) {
    const month = Number(digits.slice(2, 4))
    if (month < 1 || month > 12) return t('common.dateField.invalidMonth')
  }
  if (digits.length === 8) {
    const iso = displayToIso(`${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`)
    if (!iso) return t('common.dateField.invalid') // impossible date, e.g. 31/02
    if (props.min && iso < props.min) return t('common.dateField.past')
    return ''
  }
  return final && digits.length > 0 ? t('common.dateField.invalid') : ''
}

function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  const raw = el.value
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  let out = digits
  if (digits.length > 4) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
  else if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`
  // Keep a slash the user typed at a boundary (after dd or dd/mm) so it shows
  // immediately instead of waiting for the next digit.
  if (raw.endsWith('/') && (digits.length === 2 || digits.length === 4)) out += '/'
  text.value = out
  // Force the DOM to the sanitized value: when a keystroke (e.g. a letter) is
  // stripped and `out` matches the previous value, Vue skips the re-render and
  // the raw character would otherwise linger in the box.
  el.value = out
  error.value = validate(digits, false) // live day/month feedback
  emit('update:modelValue', displayToIso(out))
}

// On blur, validate (incl. incomplete); a valid date is normalized.
function onBlur() {
  const digits = text.value.replace(/\D/g, '').slice(0, 8)
  error.value = validate(digits, true)
  if (digits.length === 8 && !error.value) {
    text.value = isoToDisplay(displayToIso(text.value))
  }
}

function openPicker() {
  dateInput.value?.showPicker?.()
}

function onPick(e: Event) {
  error.value = ''
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}

function clear() {
  text.value = ''
  error.value = ''
  emit('update:modelValue', '')
}
</script>

<template>
  <div>
    <div class="relative">
      <input
        :value="text"
        @input="onInput"
        @blur="onBlur"
      type="text"
      inputmode="numeric"
      :placeholder="placeholder ?? 'dd/mm/yyyy'"
      class="w-full rounded-xl border bg-white py-2.5 pl-4 pr-16 text-sm outline-none transition"
      :class="error ? 'border-red-400 focus:border-red-500' : 'border-[#D9D9D9] focus:border-primary'"
    />

    <!-- Clear -->
    <button
      v-if="text"
      type="button"
      class="absolute right-9 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      aria-label="Clear"
      @click="clear"
    >
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <!-- Calendar picker -->
    <button
      type="button"
      class="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-gray-500 hover:text-primary"
      aria-label="Open calendar"
      @click="openPicker"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </button>

    <!-- Hidden native date input backing the calendar (rendered, not display:none,
         so showPicker() is allowed). -->
    <input
      ref="dateInput"
      type="date"
      :min="min"
      :value="modelValue"
      tabindex="-1"
      aria-hidden="true"
      class="pointer-events-none absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 opacity-0"
      @change="onPick"
    />
    </div>

    <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>
