<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useBooksStore } from '@/stores/books.store'
import { useAuthStore } from '@/stores/auth.store'
import LoadingSpinner from '@/components/base/LoadingSpinner.vue'
import BackButton from '@/components/base/BackButton.vue'
import ImageLightbox from '@/components/base/ImageLightbox.vue'
import IconTextButton from '@/components/base/IconTextButton.vue'
import { displayName, formatRelativeDate } from '@/utils/format'
import noImage from '@/assets/images/no-image.png'
import UserAvatar from '@/components/base/UserAvatar.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

const route = useRoute()
const booksStore = useBooksStore()
const auth = useAuthStore()

const book = computed(() => booksStore.currentBook)
const isOwner = computed(() => auth.user?.id === book.value?.users?.id)

const myRequest = computed(() =>
  booksStore.outgoingRequests.find((r) => r.book.id === book.value?.id),
)

const showRequestModal = ref(false)
const requestMessage = ref('')
const requesting = ref(false)
const requestError = ref('')

onMounted(() => {
  booksStore.fetchOne(route.params.id as string)
  if (auth.isAuthenticated) booksStore.fetchOutgoingRequests()
})

const donorName = computed(() =>
  `${book.value?.users?.first_name ?? ''} ${book.value?.users?.last_name ?? ''}`.trim(),
)

const donorInitials = computed(() => {
  const f = book.value?.users?.first_name?.[0] ?? ''
  const l = book.value?.users?.last_name?.[0] ?? ''
  return (f + l).toUpperCase()
})

const dateText = computed(() => formatRelativeDate(book.value?.created_at))

const showFullImage = ref(false)
const fullImageSrc = ref('')

function openFullImage(src: string) {
  if (!src) return
  fullImageSrc.value = src
  showFullImage.value = true
}

const messageEl = ref<HTMLTextAreaElement | null>(null)

function openRequestModal() {
  requestError.value = ''
  showRequestModal.value = true
  // Focus once the modal is in the DOM, so Enter works without a click first.
  void nextTick(() => messageEl.value?.focus())
}

async function submitRequest() {
  if (!book.value) return
  if (!requestMessage.value.trim()) {
    requestError.value = 'Please provide a message to the donor'
    return
  }
  requesting.value = true
  requestError.value = ''
  try {
    await booksStore.request(book.value.id, requestMessage.value.trim())
    showRequestModal.value = false
    requestMessage.value = ''
    // booksStore.request() only posts; nothing local knows about the new
    // request until it is read back, and the pending panel is driven by it.
    await Promise.all([booksStore.fetchOutgoingRequests(), booksStore.fetchOne(book.value.id)])
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } } }
    requestError.value = err.response?.data?.message ?? 'Request failed'
  } finally {
    requesting.value = false
  }
}
</script>

<template>
  <div class="w-full">
    <div class="mx-auto w-full max-w-7xl px-6">
      <!-- Back. Hidden as a row so its mb-6 goes with it on a phone, where
           BackButton itself renders nothing. -->
      <div class="mb-6 hidden md:block">
        <BackButton />
      </div>

      <!-- Loading -->
      <div v-if="booksStore.loading" class="flex justify-center py-20">
        <LoadingSpinner />
      </div>

      <!-- Error -->
      <div v-else-if="booksStore.error" class="py-8 text-center text-sm text-red-500">
        {{ booksStore.error }}
      </div>

      <!-- Content -->
      <div v-else-if="book" class="flex flex-col md:flex-row md:gap-8 overflow-hidden">
        <!-- Cover image — left panel -->
        <div class="w-full md:w-[55%] shrink-0">
          <!-- The cap goes on the IMAGE, not the panel. `max-h-full` on the
               image is a percentage, and a percentage height needs a definite
               container to resolve against — a panel sized by min/max-height is
               not definite, so the image drew at its natural size and spilled
               out of the box. An absolute cap always resolves. -->
          <div
            class="flex items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-4 md:h-full md:min-h-[400px] md:max-h-[560px]"
          >
            <img
              :src="book.cover_image_url || noImage"
              :alt="book.title"
              class="max-h-[240px] max-w-full cursor-pointer rounded-lg object-contain md:max-h-full"
              @click="openFullImage(book.cover_image_url || noImage)"
            />
          </div>
        </div>

        <!-- Info — right panel -->
        <div class="flex flex-1 flex-col gap-4 px-6 py-6 md:py-0">
          <!-- Donor row -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <!-- Avatar -->
              <div
                class="h-10 w-10 rounded-full overflow-hidden bg-primary flex items-center justify-center shrink-0"
                :class="book.users?.avatar_url ? 'cursor-pointer' : ''"
                @click="book.users?.avatar_url && openFullImage(book.users.avatar_url)"
              >
                <UserAvatar
                  :src="book.users?.avatar_url"
                  :initials="donorInitials"
                  text-class="text-sm !text-white"
                />
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900">{{ donorName }}</p>
                <p class="text-xs text-gray-400">{{ dateText }}</p>
              </div>
            </div>
          </div>

          <hr class="text-gray-400" />

          <!-- Title -->
          <h1 class="md:text-2xl font-semibold text-xl text-gray-900 leading-tight">
            {{ book.title }}
          </h1>

          <!-- Meta row -->
          <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span v-if="book.majors">
              <span class="font-medium text-gray-700">Department:</span> {{ book.majors.acronym }}
            </span>
            <!-- One badge style for every state, matching the dashboard: the
                 word carries the meaning, and a colour scale implies a severity
                 these states do not have. -->
            <span
              v-if="!isOwner"
              class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-primary"
            >
              {{
                book.status === 'available' && book.has_active_request
                  ? myRequest
                    ? 'Requested'
                    : 'Unavailable'
                  : book.status
              }}
            </span>
          </div>

          <!-- Description. An empty one says so rather than leaving a gap: a
               reader cannot tell "no description" from "still loading". -->
          <p v-if="book.description" class="text-sm text-gray-600 leading-relaxed">
            {{ book.description }}
          </p>
          <p v-else class="text-sm italic leading-relaxed text-gray-400">
            {{ t('common.bookDetail.noDescription') }}
          </p>

          <!-- Request sent confirmation -->
          <!-- Already requested -->
          <div v-if="myRequest?.status === 'pending'" class="mt-2 rounded-xl bg-primary/10 p-4">
            <div class="flex items-center gap-1.5">
              <!-- Solid disc with the glyph punched out (fill-rule evenodd), so
                   the "i" reads in the panel colour behind it. Same icon as the
                   waiting notice on the request detail panel. -->
              <svg
                class="h-5 w-5 shrink-0 text-primary"
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
              <p class="text-sm font-semibold text-primary">Request pending</p>
            </div>
            <!-- Same destination as the accepted panel below: that page is
                 where a request is followed and actioned. -->
            <p class="mt-1 text-sm text-black">
              You already requested this book. The book owner hasn't responded yet. Track it in your
              <RouterLink
                :to="{ name: 'dashboard-books-requesting', query: { request: myRequest?.id } }"
                class="font-semibold text-primary underline underline-offset-2 hover:text-[#00749b]"
                >Dashboard</RouterLink
              >.
            </p>
          </div>
          <div
            v-else-if="myRequest?.status === 'accepted'"
            class="mt-2 rounded-xl border border-green-200 bg-green-50 p-4"
          >
            <p class="text-sm font-semibold text-green-700">Request accepted</p>
            <!-- Links to the received-books page specifically, not /dashboard:
                 that is the one screen where the donor's contact is shown. -->
            <p class="mt-1 text-sm text-gray-600">
              The donor accepted your request. Check your
              <RouterLink
                :to="{ name: 'dashboard-books-requesting', query: { request: myRequest?.id } }"
                class="font-semibold text-primary underline underline-offset-2 hover:text-[#00749b]"
                >dashboard</RouterLink
              >
              for their contact.
            </p>
          </div>

          <!-- Declined: the end of the road for this pairing. Shown instead of
               the request button rather than beside it, so the refusal is not
               something to be clicked past. Scoped to an available book — once
               it is donated, that is the more useful thing to say. -->
          <div
            v-else-if="myRequest?.status === 'declined' && book.status === 'available'"
            class="mt-2 flex items-start gap-2 rounded-xl bg-red-100 p-4"
          >
            <svg
              class="mt-0.5 h-5 w-5 shrink-0 text-red-500"
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
            <div>
              <p class="text-sm font-semibold text-red-500">Request declined</p>
              <p class="mt-0.5 text-sm text-black">
                {{ donorName }} declined your request, so this book cannot be requested again.
              </p>
            </div>
          </div>

          <!-- Already requested by someone else -->
          <p
            v-else-if="!isOwner && book.status === 'available' && book.has_active_request"
            class="text-center text-xs text-gray-400 italic"
          >
            {{ t('common.bookDetail.alreadyRequested') }}
          </p>

          <!-- Request this book -->
          <IconTextButton
            v-else-if="!isOwner && book.status === 'available'"
            text="Request this Book"
            class="w-full justify-center"
            @click="openRequestModal"
          >
          </IconTextButton>
          <!-- The donor's own view: a request they have to answer is the one
               thing worth surfacing here, so the link goes straight to Approve
               requests, where it gets accepted or declined. pending_request is
               sent to them alone. -->
          <div
            v-else-if="isOwner && book.pending_request"
            class="mt-2 rounded-xl bg-primary/10 p-4"
          >
            <div class="flex items-center gap-1.5">
              <svg
                class="h-5 w-5 shrink-0 text-primary"
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
              <p class="text-sm font-semibold text-primary">
                {{ t('common.bookDetail.ownerPendingTitle') }}
              </p>
            </div>
            <p class="mt-1 text-sm text-black">
              {{
                t('common.bookDetail.ownerPendingBody', {
                  name: displayName(
                    book.pending_request.requester.first_name,
                    book.pending_request.requester.last_name,
                  ),
                })
              }}
              <RouterLink
                :to="{ name: 'dashboard-books-approve' }"
                class="font-semibold text-primary underline underline-offset-2 hover:text-[#00749b]"
                >{{ t('common.bookDetail.dashboardLink') }}</RouterLink
              >.
            </p>
          </div>
          <p v-else-if="isOwner" class="text-center text-xs text-gray-400 italic">Your Book</p>
          <p v-else class="text-center text-xs text-gray-400 italic">
            This book is no longer available
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- Request modal -->
  <Teleport to="body">
    <div
      v-if="showRequestModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
      @click.self="showRequestModal = false"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <p class="text-lg font-semibold text-black text-center">Request "{{ book?.title }}"</p>
        <p class="mt-1 text-xs text-gray-400">The donor will review your request.</p>
        <p v-if="requestError" class="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {{ requestError }}
        </p>

        <label class="mt-3 block text-xs font-medium text-gray-600"
          >Message <span class="text-red-500">*</span></label
        >
        <!-- Enter sends; Shift+Enter still breaks the line, so a longer message
             is not cut off by the shortcut. Matches the decline modal. -->
        <textarea
          ref="messageEl"
          v-model="requestMessage"
          rows="3"
          placeholder="Message to the donor…"
          class="mt-1 w-full rounded-xl border border-[#D9D9D9] px-4 py-2.5 text-sm outline-none focus:border-primary resize-none"
          @keydown.enter.exact.prevent="submitRequest"
        />

        <div class="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="rounded-xl border border-[#B0B0B0] py-2 text-sm text-black hover:bg-gray-50 hover:cursor-pointer"
            @click="showRequestModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="requesting"
            class="rounded-xl bg-primary py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60 hover:cursor-pointer"
            @click="submitRequest"
          >
            {{ requesting ? 'Sending…' : 'Send Request' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Fullscreen image viewer -->
  <ImageLightbox v-model="showFullImage" :src="fullImageSrc || noImage" :alt="book?.title" />
</template>
