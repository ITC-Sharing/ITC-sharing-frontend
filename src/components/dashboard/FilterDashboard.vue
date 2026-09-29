<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'

/**
 * The dashboard's filter dropdown: a bordered trigger that turns primary while
 * open, over a floating panel of choices.
 *
 * `allLabel` supplies the "no filter" choice, which is always the empty string,
 * so callers list only real options.
 *
 *   <FilterDashboard v-model="docMajor" :options="majorOptions" all-label="All departments" />
 */
export type FilterOption = { value: string; label: string }

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: FilterOption[]
    /** First entry, selected when nothing is filtered. Omit for a plain list. */
    allLabel?: string
  }>(),
  { allLabel: '' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const trigger = ref<HTMLButtonElement | null>(null)
const open = ref(false)
const pos = ref({ top: 0, left: 0, width: 0 })

const entries = computed<FilterOption[]>(() =>
  props.allLabel ? [{ value: '', label: props.allLabel }, ...props.options] : props.options,
)

const selectedLabel = computed(
  () => entries.value.find((entry) => entry.value === props.modelValue)?.label ?? props.allLabel,
)

/**
 * The panel is teleported to <body> with fixed coords: these filters sit in
 * headers and toolbars inside scroll containers, which would clip it.
 */
function place() {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  pos.value = { top: rect.bottom + 6, left: rect.left, width: rect.width }
}

function close() {
  open.value = false
  document.removeEventListener('mousedown', onOutside)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', close, true)
  window.removeEventListener('resize', close)
}

// `mousedown`, not `click`: a re-render between the two can detach the target,
// which makes the trigger itself read as "outside".
function onOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (trigger.value?.contains(target)) return
  if (target?.closest?.('[data-filter-panel]')) return
  close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

function toggle() {
  if (open.value) {
    close()
    return
  }
  place()
  open.value = true
  document.addEventListener('mousedown', onOutside)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', close, true)
  window.addEventListener('resize', close)
}

function pick(value: string) {
  close()
  emit('update:modelValue', value)
}

onBeforeUnmount(close)
</script>

<template>
  <button
    ref="trigger"
    type="button"
    :aria-expanded="open"
    @click.stop="toggle"
    :class="[
      'flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm transition-colors hover:cursor-pointer',
      open ? 'border-primary text-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-300',
    ]"
  >
    <span class="truncate">{{ selectedLabel }}</span>
    <svg
      :class="['h-4 w-4 shrink-0 transition-transform', open ? 'rotate-180' : '']"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  <Teleport to="body">
    <div
      v-if="open"
      data-filter-panel
      :style="{ top: `${pos.top}px`, left: `${pos.left}px`, width: `${pos.width}px` }"
      class="fixed z-[100] max-h-72 overflow-y-auto overscroll-contain rounded-2xl bg-white py-2 shadow-lg ring-1 ring-black/5"
      @click.stop
    >
      <button
        v-for="entry in entries"
        :key="entry.value"
        type="button"
        :title="entry.label"
        @click="pick(entry.value)"
        :class="[
          'block w-full truncate px-4 py-2.5 text-left text-sm transition-colors hover:cursor-pointer hover:bg-gray-50',
          entry.value === modelValue ? 'font-medium text-primary' : 'text-gray-700',
        ]"
      >
        {{ entry.label }}
      </button>
    </div>
  </Teleport>
</template>
