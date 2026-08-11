<script setup lang="ts">
import { computed } from 'vue'
import FileTypeIcon from '@/components/common/FileTypeIcon.vue'
import { fileExtension, isImageFile } from '@/utils/format'

/**
 * A small preview of a file: the picture itself for images, the first page for
 * anything the browser can render as a PDF, and the type-coloured icon for
 * everything else.
 *
 * The PDF page goes in an <object> rather than an <iframe> on purpose — when a
 * browser can't display the resource (iOS Safari, notably), it renders the
 * element's children instead, so the icon takes over by itself.
 */
const props = withDefaults(
  defineProps<{
    name?: string | null
    /** The file's own URL. */
    url?: string | null
    /** PDF rendition generated for office files, if there is one. */
    previewUrl?: string | null
    /** Box size in pixels. Ignored when `fill` is set. */
    size?: number
    /** Stretch to the parent box instead of a fixed square. */
    fill?: boolean
    rounded?: string
  }>(),
  { name: '', url: '', previewUrl: '', size: 40, fill: false, rounded: 'rounded-lg' },
)

const isImage = computed(() => isImageFile(props.name))

// A PDF previews itself; an office file previews through the rendition the
// server made on upload.
const pdfUrl = computed(() =>
  fileExtension(props.name) === 'pdf' ? props.url || null : props.previewUrl || null,
)

// The page is rendered at 4× and scaled down: PDF viewers lay out for a real
// page, so rendering straight into a 40px box gives an unreadable sliver.
const SCALE = 0.25
const pageStyle = computed(() =>
  props.fill
    ? { width: `${100 / SCALE}%`, height: `${100 / SCALE}%`, transform: `scale(${SCALE})` }
    : {
        width: `${props.size / SCALE}px`,
        height: `${props.size / SCALE}px`,
        transform: `scale(${SCALE})`,
      },
)
</script>

<template>
  <div
    v-if="isImage || pdfUrl"
    class="overflow-hidden bg-gray-50"
    :class="[rounded, fill ? 'h-full w-full' : 'shrink-0']"
    :style="fill ? undefined : { width: `${size}px`, height: `${size}px` }"
  >
    <img
      v-if="isImage"
      :src="url ?? ''"
      :alt="name ?? ''"
      loading="lazy"
      class="h-full w-full object-cover"
    />
    <object
      v-else
      :data="`${pdfUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`"
      type="application/pdf"
      class="pointer-events-none origin-top-left"
      :style="pageStyle"
    >
      <FileTypeIcon :name="name" :size="size" :rounded="rounded" />
    </object>
  </div>

  <!-- No preview possible — the icon stands in, centred when filling a box. -->
  <div v-else-if="fill" class="flex h-full w-full items-center justify-center">
    <FileTypeIcon :name="name" :size="size" :rounded="rounded" />
  </div>
  <FileTypeIcon v-else :name="name" :size="size" :rounded="rounded" />
</template>
