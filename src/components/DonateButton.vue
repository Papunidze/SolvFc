<script setup lang="ts">
import { browser } from 'wxt/browser'
import { DONATION_URL } from '../links'

function donate() {
  browser.tabs.create({ url: DONATION_URL })
}
</script>

<template>
  <button
    type="button"
    class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-white py-3 font-bold ring-1 ring-slate-200 transition hover:ring-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    @click="donate"
  >
    <svg class="size-4 text-rose-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6.5 5.5 5.5 0 0 1 21.5 12C19 16.5 12 21 12 21z" />
    </svg>
    Support SolvFC
  </button>
</template>
