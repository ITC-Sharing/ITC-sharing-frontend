<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type SelectOption = {
  label: string
  value: string
}

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  options: {
    type: Array as () => SelectOption[],
    default: () => [],
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'change', value: string): void
}>()

const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})

const selectedLabel = computed(() => {
  const selected = props.options.find((o) => o.value === props.modelValue)
  return selected?.label ?? props.placeholder
})

const isPlaceholder = computed(() => !props.options.find((o) => o.value === props.modelValue))

// Anchor the (teleported) menu to the trigger, flipping up and capping its
// height so it always stays within the viewport and scrolls internally.
function updatePosition() {
  const el = rootRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const gap = 8
  const maxMenu = 240
  const spaceBelow = window.innerHeight - r.bottom - gap
  const spaceAbove = r.top - gap
  const openUp = spaceBelow < Math.min(maxMenu, 160) && spaceAbove > spaceBelow
  const avail = openUp ? spaceAbove : spaceBelow
  menuStyle.value = {
    position: 'fixed',
    left: `${r.left}px`,
    width: `${r.width}px`,
    maxHeight: `${Math.max(120, Math.min(maxMenu, avail))}px`,
    ...(openUp
      ? { bottom: `${window.innerHeight - r.top + gap}px` }
      : { top: `${r.bottom + gap}px` }),
  }
}

function open() {
  isOpen.value = true
  updatePosition()
  window.addEventListener('scroll', updatePosition, true)
  window.addEventListener('resize', updatePosition)
}

function close() {
  if (!isOpen.value) return
  isOpen.value = false
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
}

function toggle() {
  if (props.disabled || props.options.length === 0) return
  if (isOpen.value) close()
  else open()
}

function select(value: string) {
  emit('update:modelValue', value)
  emit('change', value)
  close()
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (rootRef.value?.contains(target) || menuRef.value?.contains(target)) return
  close()
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  close()
})
</script>

<template>
  <div ref="rootRef" class="relative w-full">
    <button
      type="button"
      class="flex w-full items-center justify-between rounded-xl border border-[#D9D9D9] bg-white px-4 py-2.5 text-left text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-[#F5F5F5] disabled:text-gray-600 disabled:opacity-100"
      :class="isOpen ? 'border-[#0057BD] shadow-sm' : 'hover:border-[#008CB9]'"
      :disabled="disabled"
      @click.stop="toggle"
    >
      <span class="truncate" :class="isPlaceholder ? 'text-gray-400' : 'text-gray-800'">
        {{ selectedLabel }}
      </span>

      <svg
        class="ml-3 h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200"
        :class="isOpen ? 'rotate-180' : ''"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <path d="m5 7.5 5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen && options.length > 0"
        ref="menuRef"
        :style="menuStyle"
        class="z-60 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-lg"
      >
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          class="flex w-full items-center px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-[#EAF6FB] hover:text-[#008CB9]"
          :class="option.value === modelValue ? 'bg-[#F5F5F5]' : ''"
          @click.stop="select(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </Teleport>
  </div>
</template>
