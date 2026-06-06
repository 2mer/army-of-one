let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
  }
  if (ctx.state === 'suspended') {
    ctx.resume()
  }
  return ctx
}

function gate(duration: number): { stop(): void; ctx: AudioContext } {
  const c = getCtx()
  const gain = c.createGain()
  gain.gain.value = 0.08
  gain.connect(c.destination)
  gain.gain.setValueAtTime(0.08, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
  const stop = () => { gain.disconnect() }
  return { stop, ctx: c }
}

export const Synth = {
  hit(): void {
    const c = getCtx()
    const buf = c.createBuffer(1, c.sampleRate * 0.08, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
    }
    const src = c.createBufferSource()
    src.buffer = buf
    const g = gate(0.08)
    src.connect(g.ctx.destination)
    src.start()
    setTimeout(() => g.stop(), 100)
  },

  death(): void {
    const c = getCtx()
    const g = gate(0.3)
    const osc = c.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(400, c.currentTime)
    osc.frequency.exponentialRampToValueAtTime(50, c.currentTime + 0.3)
    osc.connect(g.ctx.destination)
    osc.start()
    osc.stop(c.currentTime + 0.3)
    setTimeout(() => g.stop(), 350)
  },

  walk(): void {
    const c = getCtx()
    const g = gate(0.03)
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 600
    osc.connect(g.ctx.destination)
    osc.start()
    osc.stop(c.currentTime + 0.03)
    setTimeout(() => g.stop(), 50)
  },

  buff(): void {
    const c = getCtx()
    const g = gate(0.15)
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(500, c.currentTime)
    osc.frequency.setValueAtTime(700, c.currentTime + 0.075)
    osc.connect(g.ctx.destination)
    osc.start()
    osc.stop(c.currentTime + 0.15)
    setTimeout(() => g.stop(), 200)
  },
}
