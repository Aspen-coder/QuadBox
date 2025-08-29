<script>
  import { onMount, onDestroy } from 'svelte'
  import { Chart, registerables } from 'chart.js'
  import 'chartjs-adapter-date-fns'
  // import { getAllCompletedGames } from '../lib/gamedb' // Data now comes from analytics store
  import { settings } from '../stores/settingsStore'
  import { analytics } from '../stores/analyticsStore' // Import analytics store

  Chart.register(...registerables)
  Chart.defaults.font.family = 'Go Mono'
  Chart.defaults.font.size = 16
  Chart.defaults.font.weight = 'normal'
  let chart
  let canvas

  const getColorFromTitle = (title) => {
    let hash = 2166136261
    for (let i = 0; i < title.length; i++) {
      hash ^= title.charCodeAt(i)
      hash = (hash * 16777619) >>> 0
    }

    hash ^= hash >>> 13
    hash ^= hash << 7
    hash ^= hash >>> 17

    const hue = hash % 360
    const sat = 60 + (hash % 30)
    const light = $settings.theme === 'dark'
      ? 60 + (hash % 20)
      : 55 + (hash % 25)

    return `hsl(${hue}, ${sat}%, ${light}%)`
  }

  const getChartOptions = (theme) => {
    const isDark = theme === 'dark'
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: isDark ? '#ccc' : '#333',
          },
          type: 'time',
          time: {
            unit: 'day',
            tooltipFormat: 'PP',
          },
          grid: {
            color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
          },
          title: {
            display: true,
            text: 'Date',
            color: isDark ? '#eee' : '#111'
          }
        },
        y: {
          min: 0,
          suggestedMax: 4,
          ticks: {
            color: isDark ? '#ccc' : '#333',
          },
          grid: {
            color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
          },
          title: {
            display: true,
            text: 'Average Score',
            color: isDark ? '#eee' : '#111'
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: isDark ? '#ccc' : '#333'
          }
        },
        tooltip: {
          backgroundColor: isDark ? '#333' : '#fff',
          titleColor: isDark ? '#fff' : '#000',
          bodyColor: isDark ? '#eee' : '#111',
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}`
          }
        }
      }
    }
  }

  const getDailyAveragesByTitle = (games) => {
    const grouped = {}
    console.log("Games array in getDailyAveragesByTitle:", games);

    for (const game of games) {
      console.log("Processing game object:", game);
      const { ncalc, title, dayTimestamp } = game || {}; // Safely destructure with default empty object

      if (!title || !('ncalc' in game) || dayTimestamp === undefined) continue; // Ensure properties exist

      if (!grouped[title]) grouped[title] = {}
      if (!grouped[title][dayTimestamp]) grouped[title][dayTimestamp] = []

      grouped[title][dayTimestamp].push(ncalc)
    }

    const datasets = Object.entries(grouped).map(([title, dayGroup]) => {
      const data = Object.entries(dayGroup).map(([ts, vals]) => {
        const date = new Date(new Number(ts))
        date.setHours(0, 0, 0, 0)
        return {
          x: date,
          y: vals.reduce((a, b) => a + b, 0) / vals.length,
        }
      })

      return {
        label: title,
        data,
        fill: false,
        borderWidth: 2,
        borderColor: getColorFromTitle(title),
      }
    })

    return datasets
  }

  $: allGames = ($analytics.allGames || []).filter(game => game.status !== 'tombstone' && 'ncalc' in game);

  $: datasets = getDailyAveragesByTitle(allGames);

  $: {
    if (canvas) {
      if (chart) {
        chart.destroy(); // Destroy existing chart
        chart = null;
      }
      chart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
          datasets
        },
        options: getChartOptions($settings.theme),
      });
      handleResize(); // Ensure resize is called after recreation
    }
  }

  // Old onMount data fetching is removed as it's now reactive
  // onMount(async () => {
  //   const games = (await getAllCompletedGames()).filter(game => 'ncalc' in game)
  //   const datasets = getDailyAveragesByTitle(games)
  //
  //   chart = new Chart(canvas.getContext('2d'), {
  //     type: 'line',
  //     data: {
  //       datasets
  //     },
  //     options: getChartOptions($settings.theme),
  //   })
  //   handleResize()
  // })

  const handleResize = () => {
    if (chart) {
      chart.resize()
    }
  }
  window.addEventListener('resize', handleResize)

  onDestroy(() => {
    if (chart) {
      chart.destroy()
      chart = null;
    }
    window.removeEventListener('resize', handleResize)
  })
</script>

<canvas bind:this={canvas}></canvas>

<style>
</style>