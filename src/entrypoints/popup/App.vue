<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { browser } from 'wxt/browser'
import BrandHeader from '../../components/BrandHeader.vue'
import DonateButton from '../../components/DonateButton.vue'
import StatsCard from '../../components/StatsCard.vue'
import { WEB_APP_URL } from '../../links'
import { statsItem, type SolveStats } from '../../stats'

const stats = ref<SolveStats>()

onMounted(async () => {
  stats.value = await statsItem.getValue()
})

function openWebApp() {
  browser.tabs.create({ url: WEB_APP_URL })
}

function openConfiguration() {
  browser.runtime.openOptionsPage()
}
</script>

<template>
  <main class="w-90 bg-mist text-ink">
    <div class="space-y-4 p-4">
      <BrandHeader />
      <StatsCard v-if="stats" :stats="stats" />
      <span class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
        <svg class="size-4 text-volt-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
        </svg>
        Free · unlimited solves · runs on your device
      </span>
      <nav class="space-y-2 pt-4">
        <button
          type="button"
          class="flex w-full cursor-pointer items-center justify-between rounded-full bg-volt py-2 pr-2 pl-5 font-bold transition hover:bg-volt-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          @click="openWebApp"
        >
          Open the Web App
          <span class="grid size-9 place-items-center rounded-full bg-ink text-volt">
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
              <path d="M7 17 17 7M8 7h9v9" />
            </svg>
          </span>
        </button>
        <button
          type="button"
          class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-white py-3 font-bold ring-1 ring-slate-200 transition hover:ring-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          @click="openConfiguration"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="10" cy="17" r="2" />
          </svg>
          Configuration options
        </button>
        <DonateButton />
      </nav>
    </div>
    <footer class="flex items-center justify-center gap-1.5 bg-white py-3 text-xs text-slate-500">
      <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      Your club never leaves this browser
    </footer>
  </main>
</template>
