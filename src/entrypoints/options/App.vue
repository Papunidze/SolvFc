<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BrandHeader from '../../components/BrandHeader.vue'
import DonateButton from '../../components/DonateButton.vue'
import WeightTile from '../../components/WeightTile.vue'
import { type CostWeights, DEFAULT_COST_WEIGHTS } from '../../pricing/cost'
import { loadSettings, settingsItem, type Settings } from '../../settings'

const SAVED_BADGE_MS = 1500
const TIME_PRESETS = [5, 10, 30, 60]

const settings = ref<Settings>()
const isSaved = ref(false)

const weightFields: { key: keyof CostWeights; label: string; description: string }[] = [
  { key: 'duplicate', label: 'Duplicates', description: 'Untradeable cards you own twice — cheapest to use' },
  { key: 'untradeable', label: 'Untradeables', description: "Cards you can't sell on the market" },
  { key: 'tradeable', label: 'Tradeables', description: 'Cards you could sell instead' },
  { key: 'concept', label: 'Market players', description: "Cards you'd have to buy — used when cheaper than your own" },
]

onMounted(async () => {
  settings.value = await loadSettings()
})

async function save(current: Settings) {
  await settingsItem.setValue({ timeLimitSeconds: current.timeLimitSeconds, weights: { ...current.weights } })
  isSaved.value = true
  setTimeout(() => (isSaved.value = false), SAVED_BADGE_MS)
}

function setWeight(current: Settings, key: keyof CostWeights, percent: number) {
  current.weights[key] = percent / 100
  save(current)
}

function setTimeLimit(current: Settings, seconds: number) {
  current.timeLimitSeconds = seconds
  save(current)
}
</script>

<template>
  <main class="mx-auto max-w-3xl space-y-8 px-4 py-10 text-ink">
    <header class="flex items-center justify-between">
      <BrandHeader />
      <span class="text-sm" :class="isSaved ? 'font-semibold text-volt-deep' : 'text-slate-500'">
        {{ isSaved ? 'Saved' : 'Changes save automatically' }}
      </span>
    </header>

    <template v-if="settings">
      <section class="space-y-4">
        <div>
          <h2 class="text-xl font-extrabold tracking-tight">Card value</h2>
          <p class="text-sm text-slate-500">How much of a card's price counts when picking the cheapest squad.</p>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <WeightTile
            v-for="field in weightFields"
            :key="field.key"
            :label="field.label"
            :description="field.description"
            :default-percent="Math.round(DEFAULT_COST_WEIGHTS[field.key] * 100)"
            :model-value="Math.round(settings.weights[field.key] * 100)"
            @update:model-value="setWeight(settings, field.key, $event)"
          />
        </div>
      </section>

      <section class="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <div>
          <h2 class="text-xl font-extrabold tracking-tight">Time limit</h2>
          <p class="text-sm text-slate-500">Rating SBCs finish in about a second; chemistry SBCs may use the full limit.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="seconds in TIME_PRESETS"
            :key="seconds"
            type="button"
            class="cursor-pointer rounded-full px-4 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            :class="settings.timeLimitSeconds === seconds ? 'bg-ink text-volt' : 'bg-mist hover:bg-slate-200'"
            @click="setTimeLimit(settings, seconds)"
          >
            {{ seconds }}s
          </button>
          <label class="flex items-center gap-1 rounded-full bg-mist px-4 py-2 text-sm focus-within:ring-2 focus-within:ring-ink">
            <input
              type="number"
              min="1"
              max="120"
              :value="settings.timeLimitSeconds"
              class="w-12 bg-transparent text-right font-bold outline-none"
              aria-label="Custom time limit in seconds"
              @change="setTimeLimit(settings, Number(($event.target as HTMLInputElement).value))"
            />
            <span class="text-slate-500">s</span>
          </label>
        </div>
      </section>

    </template>

    <section class="space-y-3 rounded-2xl bg-ink p-5 text-white">
      <h2 class="text-xl font-extrabold tracking-tight">SolvFC is free</h2>
      <p class="text-sm text-slate-300">No plans, no limits. If it saved you coins and you want to support development, a donation helps.</p>
      <DonateButton />
    </section>
  </main>
</template>
