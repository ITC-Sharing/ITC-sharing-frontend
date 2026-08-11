<script setup lang="ts">
import { useToast } from '@/composables/useToast'

/**
 * Renders the toast queue in the top-right corner. Mounted once, at the app
 * root, so a toast survives the component that raised it being unmounted —
 * which is the usual case: the upload modal closes as it reports success.
 */
const { toasts, dismissToast } = useToast()

const accent: Record<string, string> = {
  success: 'bg-green-50 text-green-600',
  error: 'bg-red-50 text-red-500',
  info: 'bg-primary/10 text-primary',
}
</script>

<template>
  <Teleport to="body">
    <!-- pointer-events-none on the column, auto on each card: the strip mustn't
         block clicks on the page behind it. -->
    <div class="pointer-events-none fixed right-4 top-20 z-[80] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      <TransitionGroup
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition duration-200 ease-in absolute"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
        move-class="transition duration-200"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex w-full items-start gap-3 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-black/5"
        >
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            :class="accent[toast.type]"
          >
            <svg
              v-if="toast.type === 'success'"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <svg
              v-else-if="toast.type === 'error'"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <svg
              v-else
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8h.01M11 12h1v4h1" />
            </svg>
          </div>

          <div class="min-w-0 flex-1">
            <p v-if="toast.title" class="text-sm font-semibold text-black">{{ toast.title }}</p>
            <p class="text-sm text-gray-600" :class="toast.title ? 'mt-0.5' : ''">
              {{ toast.message }}
            </p>
          </div>

          <button
            type="button"
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 hover:cursor-pointer"
            aria-label="Dismiss"
            @click="dismissToast(toast.id)"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
