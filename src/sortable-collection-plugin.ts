import { Logger } from "tuff-core/logging"
import { PartPlugin } from "tuff-core/plugins"
import { DragHandler, DropTarget } from "./handlers"
import { Part, PartConstructor, StatelessPart } from "tuff-core/parts"

const log = new Logger("SortableCollectionPlugin")

export type SortableCollectionOptions<TElementState> = {
    collectionName: string
    handleClass?: string
    onSorted: (plugin: SortableCollectionPlugin<TElementState>, evt: SortCollectionEvent<TElementState>) => void
}

export type SortCollectionEvent<TElementState> = {
    states: TElementState[]
    movedState: TElementState
    oldIndex: number
    newIndex: number
}

export default class SortableCollectionPlugin<TElementState> extends PartPlugin<SortableCollectionOptions<TElementState>> {

    onMouseDown!: (evt: MouseEvent) => any
    elem?: HTMLElement

    async init() {
        log.debug(`Initializing SortableCollection for collection ${this.state.collectionName}`)

        // Use the same listener function for every `addEventListener` call
        // so that adding it more than once does nothing
        this.onMouseDown = (evt: MouseEvent) => {
            if (evt.button != 0) return // skip right clicks
            if (!this.elem) return // somehow we got a mouse event but we haven't been rendered?

            log.debug(`Mouse down`, evt)

            if (!(evt.target instanceof HTMLElement)) return
            // skip inputs so that they can still be used
            if (evt.target.tagName == 'SELECT' || evt.target.tagName == 'INPUT' || evt.target.tagName == 'TEXTAREA') return

            if (this.state.handleClass?.length && !evt.target.closest(`.${this.state.handleClass}`)) return

            const collectionElem = this.part.getCollectionContainer(this.state.collectionName)

            // collection probably hasn't been rendered yet
            if (!collectionElem) return

            const parts = this.part.getCollectionParts(this.state.collectionName)

            const partElems = []
            let targetElem: HTMLElement | null = null
            for (const part of parts) {
                const partElem = part.element
                if (!partElem) continue

                partElems.push(partElem)
                if (partElem.contains(evt.target)) targetElem = partElem
            }

            const zoneMap = new Map<HTMLElement, HTMLElement[]>()
            zoneMap.set(collectionElem, partElems)

            if (!targetElem) return

            evt.preventDefault()
            evt.stopPropagation()
            new DragHandler(targetElem, zoneMap, this.onDrop.bind(this), evt as MouseEvent)
        }
    }

    update(elem: HTMLElement) {
        elem.addEventListener('mousedown', this.onMouseDown)
        this.elem = elem
    }

    onDrop(dropTarget: DropTarget, dragTarget: HTMLElement) {
        const collectionParts = this.part.getCollectionParts(this.state.collectionName) as Part<TElementState>[]
        const oldIndex = collectionParts.findIndex(p => p.id == dragTarget.id)
        if (oldIndex < 0) throw new Error(`Given drag target was not a member of collection ${this.state.collectionName}`)

        const targetPart = collectionParts[oldIndex]
        const collectionStates = collectionParts.map(p => p.state)
        const targetState = collectionStates.splice(oldIndex, 1)[0]
        let newIndex = dropTarget.insertRelative == 'before' ? dropTarget.index : dropTarget.index + 1
        if (oldIndex < newIndex) newIndex--
        collectionStates.splice(newIndex, 0, targetState)

        let partType = targetPart.constructor as PartConstructor<StatelessPart, any>
        this.part.assignCollection(this.state.collectionName, partType, collectionStates)

        this.state.onSorted(this, { states: collectionStates, movedState: targetState, oldIndex, newIndex })
    }
}