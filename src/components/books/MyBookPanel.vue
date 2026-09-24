<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BookInfoRow from '@/components/books/BookInfoRow.vue'
import ImageLightbox from '@/components/base/ImageLightbox.vue'
import { displayName, formatRelativeDate } from '@/utils/format'
import type { MyBook } from '@/types/books.types'

/**
 * One of your own listings, opened from the My books grid.
 *
 * Built like the requester's RequestDetailPanel — inline in place of the grid,
 * Back at the panel's edge, a centred column — so a handover reads the same
 * from both ends. No step track here: the donor's states are already spelled
 * out by the recipient row and the actions below it.
 */
const props = defineProps<{ book: MyBook; busy?: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'edit'): void
  (e: 'delete'): void
  (e: 'cancel-handover'): void
}>()

const { t } = useI18n({ useScope: 'global' })

// A cover is the one thing on this panel too small to read at panel size, and
// the listing it belongs to may be the only copy the donor has. Clicking it
// opens the same fullscreen viewer as the public detail page.
const showFullImage = ref(false)

/** Named on both of the states that have one, so the two read alike. */
const recipient = computed(() => {
  const r = props.book.request?.requester
  return r ? displayName(r.first_name, r.last_name) : ''
})

// Mirrors the server: a listing is frozen once anyone is waiting on it, and a
// book you were given is not yours to edit at all.
const canManage = computed(
  () =>
    props.book.role === 'donor' &&
    props.book.status === 'available' &&
    props.book.request?.status !== 'pending',
)

/** On a book you received, the donor is the name worth showing. */
const receivedFrom = computed(() =>
  props.book.role === 'receiver' && props.book.donor
    ? displayName(props.book.donor.first_name, props.book.donor.last_name)
    : '',
)
</script>

<template>
  <div class="rounded-2xl border border-gray-100 bg-white p-6">
    <!-- Back stays at the panel's left edge: it navigates the whole panel, so
         it belongs to the container rather than the centred content. -->
    <button
      type="button"
      class="mb-4 flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:cursor-pointer hover:text-gray-700"
      @click="emit('close')"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {{ t('common.common.back') }}
    </button>

    <div class="mx-auto max-w-lg">
      <div class="mt-5 flex flex-col items-center gap-3">
        <!-- Only clickable when there is something to enlarge: a listing
             without a cover renders an empty box, and opening that fullscreen
             shows nothing. -->
        <img
          :src="props.book.cover_image_url || ''"
          alt=""
          class="h-44 w-32 shrink-0 rounded-lg border border-gray-100 bg-white object-contain"
          :class="props.book.cover_image_url ? 'hover:cursor-pointer' : ''"
          @click="props.book.cover_image_url && (showFullImage = true)"
        />
        <!-- w-full, not flex-1: the column centres its children, so the text
             needs a definite width for both centring and truncate to work. -->
        <div class="w-full text-center">
          <h2 class="truncate text-base font-semibold text-gray-900">{{ props.book.title }}</h2>
          <p class="mt-0.5 truncate text-xs text-gray-400">
            {{
              t('dashboard.books.donatedOn', { date: formatRelativeDate(props.book.created_at) })
            }}
          </p>
          <!-- Same line as the public detail page, so a listing describes
               itself the same way wherever it is opened. -->
          <p v-if="props.book.majors" class="mt-2 text-xs text-gray-400">
            {{ t('dashboard.books.bookDepartment') }}: {{ props.book.majors.acronym }}
          </p>
          <!-- Label and muted styling copied from RequestDetailPanel, so the
               two panels read as the same screen from either side. -->
          <p v-if="props.book.description" class="mt-3 text-xs leading-relaxed text-gray-400">
            {{ t('dashboard.books.bookDescription') }}: {{ props.book.description }}
          </p>
          <p v-else class="mt-3 text-xs italic leading-relaxed text-gray-400">
            {{ t('common.bookDetail.noDescription') }}
          </p>
        </div>
      </div>

      <div v-if="receivedFrom" class="mt-5 flex w-full items-center justify-center gap-3">
        <div class="shrink-0">
          <BookInfoRow icon="owner" :label="t('dashboard.books.bookOwner')">
            <p class="truncate text-sm font-semibold text-gray-900">{{ receivedFrom }}</p>
          </BookInfoRow>
        </div>
      </div>

      <div v-else-if="recipient" class="mt-5 flex w-full items-center justify-center gap-3">
        <!-- Who has it, once there is a who. Reserved and donated both name the
             same person, so the row simply changes its label. -->
        <div class="shrink-0">
          <BookInfoRow
            icon="owner"
            :label="
              props.book.status === 'donated'
                ? t('dashboard.books.donatedStatus')
                : t('dashboard.books.reservedStatus')
            "
          >
            <p class="truncate text-sm font-semibold text-gray-900">{{ recipient }}</p>
          </BookInfoRow>
        </div>
      </div>

      <!-- Reserved: the receiver has yet to confirm, and the donor can release
           the book rather than wait for the 3-day sweep. -->
      <div
        v-if="props.book.status === 'reserved' && recipient"
        class="mx-auto mt-5 flex w-fit items-start gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm text-primary"
      >
        <!-- Sibling of the text, not inside it: as inline content the icon
             breaks onto its own line instead of sitting beside the message.
             mt-0.5 puts the disc on the first line's baseline. -->
        <svg
          class="mt-0.5 h-5 w-5 shrink-0"
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
        <p class="leading-relaxed">
          {{ t('dashboard.books.awaitingReceiver', { name: recipient }) }}
        </p>
      </div>

      <!-- w-fit and centred, not full width: cancelling is the exception here,
           not the thing the screen is for. -->
      <div v-if="props.book.status === 'reserved'" class="mt-5 flex justify-center">
        <button
          type="button"
          :disabled="props.busy"
          class="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:cursor-pointer hover:bg-gray-50 disabled:opacity-60"
          @click="emit('cancel-handover')"
        >
          {{ t('dashboard.books.cancelHandover') }}
        </button>
      </div>

      <!-- Only an available listing can be changed; the server refuses the rest,
           and an enabled button that always fails is worse than none. A w-fit
           grid rather than flex: equal columns give the two buttons the same
           width, sized to the longer label, without hard-coding one. -->
      <div v-else-if="canManage" class="mx-auto mt-5 grid w-fit grid-cols-2 gap-3">
        <button
          type="button"
          class="rounded-xl border border-gray-300 px-6 py-2 text-sm font-semibold text-gray-600 transition hover:cursor-pointer hover:bg-gray-50"
          @click="emit('edit')"
        >
          {{ t('dashboard.books.edit') }}
        </button>
        <button
          type="button"
          class="rounded-xl bg-red-500 px-6 py-2 text-sm font-semibold text-white transition hover:cursor-pointer hover:bg-red-600"
          @click="emit('delete')"
        >
          {{ t('dashboard.books.delete') }}
        </button>
      </div>

      <p
        v-else-if="props.book.role === 'donor' && props.book.status === 'donated'"
        class="mt-5 text-center text-xs text-gray-400"
      >
        {{ t('dashboard.books.cantEditDonated') }}
      </p>
    </div>

    <ImageLightbox
      v-model="showFullImage"
      :src="props.book.cover_image_url || ''"
      :alt="props.book.title"
    />
  </div>
</template>
