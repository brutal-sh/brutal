import type { ScriptValue } from '@open-pencil/scene-graph/scripts'

import candlestick from '@/assets/script-gallery/candlestick.js.txt?raw'
import chart from '@/assets/script-gallery/chart.js.txt?raw'
import circleText from '@/assets/script-gallery/circle-text.js.txt?raw'
import circularVisualizer from '@/assets/script-gallery/circular-visualizer.js.txt?raw'
import clock from '@/assets/script-gallery/clock.js.txt?raw'
import digitalSpectrum from '@/assets/script-gallery/digital-spectrum.js.txt?raw'
import digitalTime from '@/assets/script-gallery/digital-time.js.txt?raw'
import flowField from '@/assets/script-gallery/flow-field.js.txt?raw'
import gauge from '@/assets/script-gallery/gauge.js.txt?raw'
import lines from '@/assets/script-gallery/lines.js.txt?raw'
import candlestickPreview from '@/assets/script-gallery/previews/candlestick.png'
import chartPreview from '@/assets/script-gallery/previews/chart.png'
import circleTextPreview from '@/assets/script-gallery/previews/circle-text.png'
import circularVisualizerPreview from '@/assets/script-gallery/previews/circular-visualizer.png'
import clockPreview from '@/assets/script-gallery/previews/clock.png'
import digitalSpectrumPreview from '@/assets/script-gallery/previews/digital-spectrum.png'
import digitalTimePreview from '@/assets/script-gallery/previews/digital-time.png'
import flowFieldPreview from '@/assets/script-gallery/previews/flow-field.png'
import gaugePreview from '@/assets/script-gallery/previews/gauge.png'
import linesPreview from '@/assets/script-gallery/previews/lines.png'
import radarPreview from '@/assets/script-gallery/previews/radar.png'
import radar from '@/assets/script-gallery/radar.js.txt?raw'

export interface GalleryScript {
  id: string
  name: string
  width: number
  height: number
  clip: boolean
  inputs: Record<string, ScriptValue>
  source: string
  preview: string
}

export const GALLERY_SCRIPT_PREFIX = 'open-pen:gallery/'

export const galleryScripts: readonly GalleryScript[] = [
  {
    id: 'candlestick',
    name: 'Candlestick',
    width: 540,
    height: 361,
    clip: true,
    inputs: { wickWidth: 2, bearColor: '#ef4444', bullColor: '#22c55e', candles: 50 },
    source: candlestick,
    preview: candlestickPreview
  },
  {
    id: 'chart',
    name: 'Chart',
    width: 660,
    height: 336,
    clip: true,
    inputs: {},
    source: chart,
    preview: chartPreview
  },
  {
    id: 'circle-text',
    name: 'Circle Text',
    width: 407,
    height: 420,
    clip: true,
    inputs: { showCircle: false, filled: false },
    source: circleText,
    preview: circleTextPreview
  },
  {
    id: 'circular-visualizer',
    name: 'Circular Visualizer',
    width: 407,
    height: 420,
    clip: true,
    inputs: { colorStart: '#aa00ff', colorEnd: '#a2ff00' },
    source: circularVisualizer,
    preview: circularVisualizerPreview
  },
  {
    id: 'clock',
    name: 'Clock',
    width: 300,
    height: 300,
    clip: false,
    inputs: { Seconds: 36.4, Minutes: 29.4 },
    source: clock,
    preview: clockPreview
  },
  {
    id: 'digital-spectrum',
    name: 'Digital Spectrum',
    width: 589,
    height: 336,
    clip: true,
    inputs: {},
    source: digitalSpectrum,
    preview: digitalSpectrumPreview
  },
  {
    id: 'digital-time',
    name: 'Digital Time',
    width: 379,
    height: 300,
    clip: true,
    inputs: {},
    source: digitalTime,
    preview: digitalTimePreview
  },
  {
    id: 'flow-field',
    name: 'Flow Field',
    width: 650,
    height: 610,
    clip: true,
    inputs: {
      fadeTrails: true,
      particles: 1000,
      steps: 20,
      noiseStrength: 5,
      lineWidth: 4,
      noiseScale: 0,
      stepSize: 3,
      timeScale: 0.2,
      color1: '#3939ff',
      color2: '#6969ff',
      color3: '#7777f8',
      color4: '#b4b4fd',
      bgColor: '#000000'
    },
    source: flowField,
    preview: flowFieldPreview
  },
  {
    id: 'gauge',
    name: 'Gauge',
    width: 300,
    height: 300,
    clip: false,
    inputs: {},
    source: gauge,
    preview: gaugePreview
  },
  {
    id: 'lines',
    name: 'Lines',
    width: 407,
    height: 420,
    clip: true,
    inputs: { lines: 33 },
    source: lines,
    preview: linesPreview
  },
  {
    id: 'radar',
    name: 'Radar',
    width: 300,
    height: 300,
    clip: false,
    inputs: {},
    source: radar,
    preview: radarPreview
  }
]
