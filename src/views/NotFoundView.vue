<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * The catch-all page.
 *
 * Sits inside the main layout so the nav is still there — a wrong URL is most
 * often a typo or a stale link, and the fastest way out is the menu the visitor
 * already knows.
 */
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <!-- -mt-25 cancels the layout's pt-25 so the white reaches the nav instead of
       leaving the page's grey showing through; pt-25 puts it back as inner
       space, keeping the block centred below the bar and the page at 100vh. -->
  <div
    class="-mt-25 flex min-h-screen flex-col items-center justify-center bg-white px-6 pt-25 pb-10 text-center"
  >
    <!-- Sized in viewport units so the number stays the page's whole subject on
         a phone as much as on a desktop; the cap keeps it from overflowing on
         very wide screens. -->
    <p class="font-bold leading-none tracking-tight text-black" style="font-size: min(34vw, 18rem)">
      404
    </p>

    <p class="mt-6 text-lg text-black sm:text-xl">{{ t('common.notFound.title') }}</p>

    <RouterLink
      to="/"
      class="mt-10 inline-flex items-center justify-center bg-primary px-8 py-3 text-base rounded-xl text-white transition hover:bg-primary-hover focus:outline-none"
    >
      {{ t('common.notFound.backHome') }}
    </RouterLink>
  </div>
</template>
