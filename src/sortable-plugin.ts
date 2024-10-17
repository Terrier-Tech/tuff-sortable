import {PartPlugin} from "tuff-core/plugins"
import {Logger} from "tuff-core/logging"
import Dom from "tuff-core/dom"
import {DragHandler, DropTarget} from "./handlers"

const log = new Logger("SortablePlugin")

export type SortableOptions = {
    zoneClass: string
    targetClass: string
    handleClass?: string
    onSorted: (plugin: SortablePlugin, evt: SortEvent) => void
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
                if (evt.target.tagName == 'SELECT' || evt.target.tagName == 'INPUT' || evt.target.tagName == 'TEXTAREA') {
                    return // skip inputs so that they can still be used
                }
                const target = Dom.queryAncestorClass(evt.target, this.state.targetClass)
                // filter by the handle class if present
                const handled = target && (!this.state.handleClass?.length || Dom.queryAncestorClass(evt.target, this.state.handleClass))
                if (handled) {
                    const zone = Dom.queryAncestorClass(target, this.state.zoneClass, false)
                    if (zone && this.elem) {
                        evt.preventDefault()
                        evt.stopPropagation()
                        const zoneMap = this.createZoneMap(this.elem)
                        new DragHandler(target, zoneMap, this.onDrop.bind(this), evt as MouseEvent)
                    }
                }
            }
        }
    }

    /**
     * Maps each possible zone to all of the possible targets within that zone
     * @param elem
     */
    createZoneMap(elem: HTMLElement): Map<HTMLElement, HTMLElement[]> {
        const zoneMap = new Map<HTMLElement, HTMLElement[]>()
        elem.querySelectorAll<HTMLElement>(`.${this.state.zoneClass}`).forEach(zoneElem => {
            let targets = Array.from(zoneElem.querySelectorAll<HTMLElement>(`.${this.state.targetClass}`))
            zoneMap.set(zoneElem, targets)
        })
        return zoneMap
    }

    update(elem: HTMLElement) {
        elem.addEventListener('mousedown', this.onMouseDown)
        this.elem = elem
    }

    /**
     * The handler calls this, which then calls the state callback.
     */
    onDrop(dropTarget: DropTarget, dragTarget: HTMLElement) {
        const fromZone = Dom.queryAncestorClass(dragTarget, this.state.zoneClass, false)
        if (!fromZone) throw new Error(`Given drag target did not come from a zone with class ${this.state.zoneClass}`)

        const fromChildren = Array.from(fromZone.querySelectorAll<HTMLElement>(`.${this.state.targetClass}`))

        log.debug(`Moving drag target ${dropTarget.insertRelative} drop target ${dropTarget.index}`)
        if (dropTarget.insertRelative == 'before') {
            // move the drag target to before the drop target
            dropTarget.elem.before(dragTarget)
        }
        else {
            // move the drag target to after the drop target
            dropTarget.elem.after(dragTarget)
        }

        // notify the plugin callback
        const toChildren = Array.from(dropTarget.zone.elem.querySelectorAll<HTMLElement>(`.${this.state.targetClass}`))
        this.state.onSorted(this, {fromZone, fromChildren, toZone: dropTarget.zone.elem, toChildren, target: dragTarget})
    }

}