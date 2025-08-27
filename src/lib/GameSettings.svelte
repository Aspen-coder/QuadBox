<script>
  import { gameSettings } from "../stores/gameSettingsStore"
  import { settings } from "../stores/settingsStore"
  import { Info } from "@lucide/svelte"

  export let debouncedSaveSettings

  const clampNumber = (field, min, value, max) => {
    if (value < min || max < value) {
      return
    }
    gameSettings.setField(field, value)
    debouncedSaveSettings()
  }

  const toggleShapeOrColor = (event, field) => {
    gameSettings.setField(field, event.target.checked)
    if (event.target.checked) { // Fixed: was event.target.value
      gameSettings.setField('enableShapeColor', false)
    }
    debouncedSaveSettings()
  }

  const toggleShapeAndColor = (event) => {
    gameSettings.setField('enableShapeColor', event.target.checked)
    if (event.target.checked) { // Fixed: was event.target.value
      gameSettings.setField('enableShape', false)
      gameSettings.setField('enableColor', false)
    }
    debouncedSaveSettings()
  }

  // For range inputs, we need to handle them differently since they update frequently
  const handleRangeChange = (field, value) => {
    gameSettings.setField(field, value)
    debouncedSaveSettings()
  }

  const handleCheckboxChange = (field, value) => {
    gameSettings.setField(field, value)
    debouncedSaveSettings()
  }

  const handleNumberChange = (field, value) => {
    gameSettings.setField(field, value)
    debouncedSaveSettings()
  }

  $: numTrials = $gameSettings?.numTrials || 0
  
</script>

<div class="flex flex-col gap-1">
  <label class="text-lg">N-back: {$gameSettings?.nBack || 1}
    <input 
      type="range" 
      min="1" 
      max="12" 
      value={$gameSettings?.nBack || 1}
      on:input={(e) => handleRangeChange('nBack', +e.target.value)}
      class="range" 
    />
  </label>
</div>
<div class="flex flex-col gap-1">
  <label class="text-lg">Trial time: {$gameSettings?.trialTime || 1000}ms
    <input 
      type="range" 
      min="1000" 
      max="5000" 
      value={$gameSettings?.trialTime || 1000}
      on:input={(e) => handleRangeChange('trialTime', +e.target.value)}
      step="100" 
      class="range" 
    />
  </label>
</div>
<div class="grid grid-cols-[6fr_4fr] items-center gap-4">
  <label for="num-trials" class="text-lg">Num trials:</label>
  <input 
    id="num-trials" 
    type="number" 
    min="10" 
    max="999" 
    value={numTrials} 
    on:input={(e) => clampNumber('numTrials', 10, +e.target.value, 999)} 
    step="1" 
    class="input" 
  />
</div>
<div class="flex flex-col gap-1">
  <label class="text-lg">
    <span class="flex items-center justify-between">
      Match chance: {$gameSettings?.matchChance || 25}%
      <div class="relative group inline-block">
        <Info size="16" />
        <div class="alert absolute right-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:block text-xs p-2 rounded shadow w-48 z-10">
          Chance of a stimulus from n trials ago repeating.
        </div>
      </div>
    </span>
    <input 
      type="range" 
      min="5" 
      max="75" 
      value={$gameSettings?.matchChance || 25}
      on:input={(e) => handleRangeChange('matchChance', +e.target.value)}
      step="1" 
      class="range" 
    />
  </label>
</div>
<div class="flex flex-col gap-1">
  <label class="text-lg">
    <span class="flex items-center justify-between">
      Interference: {$gameSettings?.interference || 0}%
      <div class="relative group inline-block">
        <Info size="16" />
        <div class="alert absolute right-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:block text-xs p-2 rounded shadow w-48 z-10">
          Chance of using repeats from n±1 trials ago.<br><br>
          Increases difficulty.
        </div>
      </div>
    </span>
    <input 
      type="range" 
      min="0" 
      max="75" 
      value={$gameSettings?.interference || 0}
      on:input={(e) => handleRangeChange('interference', +e.target.value)}
      step="1" 
      class="range" 
    />  
  </label>
</div>
{#if $settings.mode === 'custom'}
<div class="grid grid-cols-[7fr_3fr] items-center gap-4">
  <label for="enable-audio" class="text-lg">Audio:</label>
  <input 
    id="enable-audio" 
    type="checkbox" 
    checked={$gameSettings?.enableAudio || false}
    on:change={(e) => handleCheckboxChange('enableAudio', e.target.checked)}
    class="toggle" 
  />
</div>
<div class="grid grid-cols-[7fr_3fr] items-center gap-4">
  <label for="enable-color" class="text-lg">Color:</label>
  <input 
    id="enable-color" 
    type="checkbox" 
    checked={$gameSettings?.enableColor || false}
    on:change={(e) => toggleShapeOrColor(e, 'enableColor')} 
    class="toggle" 
  />
</div>
<div class="grid grid-cols-[7fr_3fr] items-center gap-4">
  <label for="enable-shape" class="text-lg">Shape:</label>
  <input 
    id="enable-shape" 
    type="checkbox" 
    checked={$gameSettings?.enableShape || false}
    on:change={(e) => toggleShapeOrColor(e, 'enableShape')} 
    class="toggle" 
  />
</div>
<div class="grid grid-cols-[7fr_3fr] items-center gap-4">
  <label for="enable-shape-color" class="text-lg">Pattern:</label>
  <input 
    id="enable-shape-color" 
    type="checkbox" 
    checked={$gameSettings?.enableShapeColor || false}
    on:change={(e) => toggleShapeAndColor(e)} 
    class="toggle" 
  />
</div>
{/if}