type Handler<D> = (data: D) => void

export class EventBus<Events extends Record<string, unknown>> {
  private handlers = new Map<keyof Events, Set<Handler<unknown>>>()

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(handler as Handler<unknown>)
  }

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    const set = this.handlers.get(event)
    if (set) {
      set.delete(handler as Handler<unknown>)
    }
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const set = this.handlers.get(event)
    if (set) {
      for (const handler of set) {
        handler(data)
      }
    }
  }

  removeAll(): void {
    this.handlers.clear()
  }
}
