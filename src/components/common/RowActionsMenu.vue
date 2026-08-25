<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'

export type RowAction = {
  key: string
  label: string
  tone?: 'success' | 'danger'
}

const props = defineProps<{ items: RowAction[]; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'select', key: string): void }>()

const button = ref<HTMLButtonElement | null>(null)
const open = ref(false)
const pos = ref({ top: 0, right: 0 })

/**
 * The menu is teleported to <body> with fixed coords: rows live inside a card
 * with `overflow-y-auto`, which would clip an absolutely positioned dropdown.
 */
function place() {
  const rect = button.value?.getBoundingClientRect()
  if (!rect) return
  // Anchored by its right edge so the panel sizes to its labels instead of
  // being padded out to a fixed width.
  pos.value = { top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) }
}

function close() {
  open.value = false
  document.removeEventListener('mousedown', onOutside)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', close, true)
  window.removeEventListener('resize', close)
}

// `mousedown`, not `click`: a re-render between mousedown and click can detach
// the target, which makes the trigger itself read as "outside".
function onOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (button.value?.contains(target)) return
  if (target?.closest?.('[data-row-actions-menu]')) return
  close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

function toggle() {
  if (props.disabled) return
  if (open.value) {
    close()
    return
  }
  place()
  open.value = true
  document.addEventListener('mousedown', onOutside)
  document.addEventListener('keydown', onKeydown)
  // Scrolling the list would strand the menu, so dismiss instead of tracking.
  window.addEventListener('scroll', close, true)
  window.addEventListener('resize', close)
}

function pick(item: RowAction) {
  close()
  emit('select', item.key)
}

onBeforeUnmount(close)
</script>

<template>
  <button
    ref="button"
    type="button"
    :disabled="disabled"
    aria-label="Actions"
    :aria-expanded="open"
    @click.stop="toggle"
    :class="[
      'flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:cursor-pointer hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50',
      open ? 'bg-gray-100 text-gray-600' : '',
    ]"
  >
    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  </button>

  <Teleport to="body">
    <div
      v-if="open"
      data-row-actions-menu
      :style="{ top: `${pos.top}px`, right: `${pos.right}px` }"
      class="fixed z-[100] w-max min-w-32 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
      @click.stop
    >
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        @click="pick(item)"
        :class="[
          'block w-full px-3 py-2 text-left text-sm font-medium transition-colors hover:cursor-pointer',
          item.tone === 'success'
            ? 'text-green-600 hover:bg-green-50'
            : item.tone === 'danger'
              ? 'text-red-600 hover:bg-red-50'
              : 'text-gray-700 hover:bg-gray-50',
        ]"
      >
        {{ item.label }}
      </button>
    </div>
  </Teleport>
</template>
