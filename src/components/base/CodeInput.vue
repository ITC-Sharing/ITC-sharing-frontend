<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

/**
 * Six boxes that behave like one field.
 *
 * Six separate inputs rather than one, because a code arrives as six separate
 * characters in someone's head and reads back as six separate characters on
 * the screen — but every behaviour below exists to stop them acting like six
 * separate fields: paste fills all of them, backspace walks back through them,
 * and the model is always the whole string.
 */
const props = defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  /** Fired when the sixth digit lands, so the form can submit itself. */
  (e: 'complete', value: string): void
}>()

const LENGTH = 6

const boxes = ref<HTMLInputElement[]>([])
const digits = computed(() => {
  const chars = props.modelValue.split('')
  return Array.from({ length: LENGTH }, (_, i) => chars[i] ?? '')
})

function set(next: string) {
  const cleaned = next.replace(/\D/g, '').slice(0, LENGTH)
  emit('update:modelValue', cleaned)
  if (cleaned.length === LENGTH) emit('complete', cleaned)
}

async function focusBox(index: number) {
  await nextTick()
  boxes.value[Math.max(0, Math.min(LENGTH - 1, index))]?.focus()
}

/**
 * One keystroke into one box.
 *
 * Reads the box's whole value rather than the last character: on a phone,
 * autofill and some keyboards drop several digits into one box at once, and
 * taking only the last one would silently discard the rest.
 */
function onInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const typed = target.value.replace(/\D/g, '')

  if (!typed) {
    // A digit was deleted rather than typed.
    const chars = digits.value.slice()
    chars[index] = ''
    set(chars.join('').padEnd(0, ''))
    return
  }

  const chars = digits.value.slice()
  for (let i = 0; i < typed.length && index + i < LENGTH; i++) {
    chars[index + i] = typed[i] ?? ''
  }
  set(chars.join(''))
  void focusBox(index + typed.length)
}

/**
 * Backspace on an empty box steps back and clears the one before it.
 *
 * Without this, deleting a mistyped digit means clicking into the right box
 * first — which is the single most irritating thing about code inputs.
 */
function onKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    event.preventDefault()
    const chars = digits.value.slice()
    chars[index - 1] = ''
    set(chars.join('').replace(/\s/g, ''))
    void focusBox(index - 1)
    return
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    void focusBox(index - 1)
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    void focusBox(index + 1)
  }
}

/** Pasting the whole code into any box fills the lot. */
function onPaste(event: ClipboardEvent) {
  event.preventDefault()
  const pasted = event.clipboardData?.getData('text') ?? ''
  set(pasted)
  void focusBox(Math.min(pasted.replace(/\D/g, '').length, LENGTH - 1))
}

// Cleared from outside (a failed attempt) — put the cursor back at the start
// so the next code can just be typed.
watch(
  () => props.modelValue,
  (value) => {
    if (value === '') void focusBox(0)
  },
)

defineExpose({ focus: () => focusBox(0) })
</script>

<template>
  <div class="flex justify-center gap-2" dir="ltr">
    <input
      v-for="(digit, index) in digits"
      :key="index"
      :ref="(el) => (boxes[index] = el as HTMLInputElement)"
      :value="digit"
      :disabled="disabled"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="6"
      class="h-14 w-11 rounded-xl border border-gray-200 text-center text-2xl font-semibold text-gray-900 focus:border-primary focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
      @input="onInput(index, $event)"
      @keydown="onKeydown(index, $event)"
      @paste="onPaste"
      @focus="($event.target as HTMLInputElement).select()"
    />
  </div>
</template>
