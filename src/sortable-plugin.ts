import {PartPlugin} from "tuff-core/plugins"
import {Logger} from "tuff-core/logging"
import Dom from "./dom.ts"
import {DragHandler} from "./handlers.ts"

const log = new Logger("SortablePlugin")

export type SortableOptions = {
    zoneClass: string
    targetClass: string
    onSorted: (plugin: SortablePlugin, evt: SortEvent) => any
}

export type SortEvent = {
    fromZone: HTMLElement
    toZone: HTMLElement
    fromChildren: HTMLElement[]
    toChildren: HTMLElement[]
    target: HTMLElement
}

export default class SortablePlugin extends PartPlugin<SortableOptions> {

    onMouseDown!: EventListener
    dragHandler?: DragHandler

    async init() {
        log.info(`Initializing Sortable for container .${this.state.zoneClass} and target .${this.state.targetClass}`)

        // Use the same listener function for every `addEventListener` call
        // so that adding it more than once does nothing
        this.onMouseDown = (evt: Event) => {
            log.info(`Mouse down`, evt)
            if (evt.target instanceof HTMLElement) {
                const target = Dom.queryAncestorClass(evt.target, this.state.targetClass)
                if (target) {
                    const container = Dom.queryAncestorClass(target, this.state.zoneClass, false)
                    if (container) {
                        evt.preventDefault()
                        evt.stopPropagation()
                        this.dragHandler = new DragHandler(this, container, target, evt as MouseEvent)
                    }
                }
            }
        }
    }

    update(elem: HTMLElement) {
        elem.addEventListener('mousedown', this.onMouseDown)
    }

    get zoneClass(): string {
        return this.state.zoneClass
    }

    get targetClass(): string {
        return this.state.targetClass
    }

    /**
     * The handler calls this, which then calls the state callback.
     * @param evt
     */
    onSorted(evt: SortEvent) {
        this.state.onSorted(this, evt)
    }

}