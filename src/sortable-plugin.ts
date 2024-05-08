import {PartPlugin} from "tuff-core/plugins"
import {Logger} from "tuff-core/logging"
import Dom from "tuff-core/dom"
import {DragHandler} from "./handlers"

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

    onMouseDown!: (evt: MouseEvent) => any
    dragHandler?: DragHandler
    elem?: HTMLElement

    async init() {
        log.debug(`Initializing Sortable for container .${this.state.zoneClass} and target .${this.state.targetClass}`)

        // Use the same listener function for every `addEventListener` call
        // so that adding it more than once does nothing
        this.onMouseDown = (evt: MouseEvent) => {
            if (evt.button != 0) {
                return // skip right clicks
            }
            log.debug(`Mouse down`, evt)
            if (evt.target instanceof HTMLElement) {
                if (evt.target.tagName == 'SELECT' || evt.target.tagName == 'INPUT') {
                    return // skip inputs so that they can still be used
                }
                const target = Dom.queryAncestorClass(evt.target, this.state.targetClass)
                if (target) {
                    const zone = Dom.queryAncestorClass(target, this.state.zoneClass, false)
                    if (zone && this.elem) {
                        evt.preventDefault()
                        evt.stopPropagation()
                        this.dragHandler = new DragHandler(this, this.elem, zone, target, evt as MouseEvent)
                    }
                }
            }
        }
    }

    update(elem: HTMLElement) {
        elem.addEventListener('mousedown', this.onMouseDown)
        this.elem = elem
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