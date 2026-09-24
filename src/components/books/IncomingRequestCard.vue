<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BookGridCard from '@/components/books/BookGridCard.vue'
import { displayName } from '@/utils/format'
import type { MyBook } from '@/types/books.types'

/**
 * One of your listings with someone waiting on an answer.
 *
 * Lives in Book Activity rather than My books: a book under request is not a
 * listing you can edit or delete, it is a decision you owe someone — so it sits
 * with the rest of the request traffic instead of among the shelf.
 */
const props = defineProps<{
  book: MyBook
  accepting?: boolean
  declining?: boolean
}>()

const emit = defineEmits<{ (e: 'accept'): void; (e: 'decline'): void }>()

const { t } = useI18n({ useScope: 'global' })

const expanded = ref(false)
const messageEl = ref<HTMLElement | null>(null)
/** True when the clamp is actually hiding something — see measure(). */
const canExpand = ref(false)

/**
 * Two rendered lines, clamped in CSS rather than cut at a character count: the
 * messages are often Khmer, where a fixed character budget is a poor stand-in
 * for how much fits on a line.
 *
 * That leaves asking the element as the only way to know whether anything is
 * hidden — and only while collapsed, since an expanded paragraph never
 * overflows and would report that there is nothing to show.
 */
function measure() {
  const el = messageEl.value
  if (!el || expanded.value) return
  canExpand.value = el.scrollHeight > el.clientHeight + 1
}

onMounted(measure)
watch([() => props.book.request?.message, expanded], () => void nextTick(measure))
</script>

<template>
  <BookGridCard :cover-url="props.book.cover_image_url" highlight>
    <div class="flex items-center gap-2">
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <p class="text-md min-w-0 flex-1 truncate font-semibold text-black">
          {{ props.book.title }}
        </p>
      </div>
      <span
        class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
      >
        {{ t('dashboard.books.requestingStatus') }}
      </span>
    </div>

    <p v-if="props.book.request" class="truncate text-xs text-gray-500">
      {{
        t('dashboard.books.requestedBy', {
          name: displayName(
            props.book.request.requester.first_name,
            props.book.request.requester.last_name,
          ),
        })
      }}
    </p>
    <!-- Why they want it: the whole basis for accepting or declining, so it
         belongs next to the buttons. -->
    <div v-if="props.book.request?.message" class="py-2 text-xs text-gray-500">
      <!-- Inline label, so a long message keeps flowing under it instead of
           being pushed onto its own line. Colon in the template, matching
           BookInfoRow. -->
      <p ref="messageEl" :class="expanded ? '' : 'line-clamp-2'">
        <span class="font-semibold text-black">{{ t('dashboard.books.requestMessage') }}:</span>
        {{ props.book.request.message }}
      </p>
      <!-- Below the clamp, not inside it: an inline toggle is part of the text
           and would be clipped along with the lines it reveals. -->
      <button
        v-if="canExpand || expanded"
        type="button"
        class="mt-0.5 cursor-pointer font-semibold text-gray-500 hover:text-gray-700"
        @click="expanded = !expanded"
      >
        {{ expanded ? t('dashboard.books.seeLess') : t('dashboard.books.seeMore') }}
      </button>
    </div>

    <div class="mt-auto flex gap-2">
      <button
        type="button"
        :disabled="props.declining"
        class="flex-1 cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
        @click="emit('decline')"
      >
        {{ props.declining ? '…' : t('dashboard.books.reject') }}
      </button>
      <button
        type="button"
        :disabled="props.accepting"
        class="flex-1 cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        @click="emit('accept')"
      >
        {{ props.accepting ? '…' : t('dashboard.books.accept') }}
      </button>
    </div>
  </BookGridCard>
</template>
