import Vecs, {Vec} from 'tuff-core/vecs'
import SortablePlugin from "./sortable-plugin"
import {Logger} from "tuff-core/logging"
import Html from 'tuff-core/html'
import Boxes, { Box } from 'tuff-core/boxes'
import Arrays from 'tuff-core/arrays'

const log = new Logger("Handlers")

type InsertDirection = 'left' | 'right' | 'top' | 'bottom'

type DropTarget = {
    zone: DropZone
    elem: HTMLElement
    box: Box
    index: number
    insertDirection?: InsertDirection
    insertRelative?: 'before' | 'after'
}

type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse'

const dragHighlightClass = 'tuff-sortable-dragging'
const dropCursorClass = 'tuff-sortable-drop-cursor'
const possibleDropZoneClass = 'tuff-sortable-possible-drop-zone'
const activeDropZoneClass = 'tuff-sortable-active-drop-zone'
const bodyDraggingClass = 'tuff-sortable-in-progress'
const minCursorSize = 8

class DropZone {
    flexDirection!: FlexDirection
    cursorSize!: number
    possibleDropTargets: DropTarget[] = []
    zoneBox!: Box

    constructor(readonly handler: DragHandler, readonly elem: HTMLElement) {
        this.zoneBox = elem.getBoundingClientRect()
        elem.classList.add(possibleDropZoneClass)

        // ensure the element is flex and get its flex direction
        if ('computedStyleMap' in elem) {
            const computedStyle = (elem as any).computedStyleMap() as any // don't know why we can't use StylePropertyMapReadOnly
            if (computedStyle.get('display')?.toString() != 'flex') {
                throw `Sortable containers must be display: flex, not ${computedStyle.get('display')}`
            }
            this.flexDirection = computedStyle.get('flex-direction')?.toString() as FlexDirection
        }
        else {
            log.warn(`Browser does not support computedStyleMap, assuming flex-direction=row`)
            this.flexDirection = 'row'
        }

        elem.querySelectorAll(`.${handler.plugin.targetClass}`).forEach((elem, index) => {
            if (elem instanceof HTMLElement) {
                const box = elem.getBoundingClientRect()
                this.possibleDropTargets.push({zone: this, elem, box: box, index})
            }
        })

        // and compute the gap by finding the minimum distance between boxes
        const boxes = this.possibleDropTargets.map(dt => dt.box)
        const distances = Arrays.compact(Arrays.mapPairs(boxes, (b1, b2) => {
            const distance = Boxes.distance(b1, b2)
            return distance > 0 ? distance : null // ignore overlapping boxes
        }))
        this.cursorSize = Math.max(Arrays.min(distances), minCursorSize)

        log.debug(`${this.flexDirection} drop zone has cursor size ${this.cursorSize}px`)
    }

    /**
     * Find the closest drop target for the given translation of the drag target.
     * @param diff
     */
    findDropTarget(diffedBox: Box): DropTarget | null {
        // return null if they box is outside of the container
        const distance = Boxes.distance(this.zoneBox, diffedBox)
        if (distance >= 0) {
            this.elem.classList.remove(activeDropZoneClass)
            return null
        }

        // compute the closest drop target
        let minDistance = 9999999
        let dropTarget: DropTarget | null = null
        for (const child of this.possibleDropTargets) {
            // move the box so that it can be compared directly to the target box
            const distance = Boxes.distance(child.box, diffedBox)
            if (distance < minDistance) {
                minDistance = distance
                dropTarget = child
            }
        }

        this.clearCursor()

        if (dropTarget) { // this should always be true
            this.elem.classList.add(activeDropZoneClass)
            if (dropTarget.elem == this.handler.dragTarget) {
                log.debug("The target is the closest, nothing to change")
            } else {
                this.computeInsert(dropTarget, diffedBox)
                log.debug(`Insert ${dropTarget.insertRelative} ${dropTarget.insertDirection} of ${dropTarget.index}`)
            }
            return dropTarget
        }
        return null
    }

    /**
     * Remove the cursor from the DOM.
     */
    clearCursor() {
        this.elem.querySelector(`.${dropCursorClass}`)?.remove()
        this.elem.classList.remove(activeDropZoneClass)
    }

    dispose() {
        this.elem.classList.remove(possibleDropZoneClass)
        this.elem.classList.remove(activeDropZoneClass)
        this.clearCursor()
    }

    /**
     * Compute the insertRelative and insertDirection for the given drop target
     * @param dropTarget
     * @param diffedBox the target's box offset by the interaction diff
     */
    computeInsert(dropTarget: DropTarget, diffedBox: Box) {
        const diffedCenter = Boxes.center(diffedBox)
        const dropCenter = Boxes.center(dropTarget.box)
        if (this.flexDirection.includes('row')) {
            if (diffedCenter.x >= dropCenter.x) { // it's to the right
                dropTarget.insertDirection = 'right'
                if (this.flexDirection == 'row-reverse') {
                    dropTarget.insertRelative = 'before'
                } else { // row
                    dropTarget.insertRelative = 'after'
                }
            } else { // it's to the left
                dropTarget.insertDirection = 'left'
                if (this.flexDirection == 'row-reverse') {
                    dropTarget.insertRelative = 'after'
                } else { // row
                    dropTarget.insertRelative = 'before'
                }
            }
        } else { //column
            if (diffedCenter.y >= dropCenter.y) { // it's below
                dropTarget.insertDirection = 'bottom'
                if (this.flexDirection == 'column-reverse') {
                    dropTarget.insertRelative = 'before'
                } else { // column
                    dropTarget.insertRelative = 'after'
                }
            } else { // it's above
                dropTarget.insertDirection = 'top'
                if (this.flexDirection == 'column-reverse') {
                    dropTarget.insertRelative = 'after'
                } else { // column
                    dropTarget.insertRelative = 'before'
                }
            }
        }
        this.addDropCursor(dropTarget)
    }

    /**
     * Add a cursor to the container based on the dropTarget offset position and insertDirection.
     * @param dropTarget
     */
    addDropCursor(dropTarget: DropTarget) {
        const box = {
            x: dropTarget.elem.offsetLeft,
            y: dropTarget.elem.offsetTop,
            width: dropTarget.elem.offsetWidth,
            height: dropTarget.elem.offsetHeight
        }

        // adjust the box size and position based on the insert direction
        switch (dropTarget.insertDirection) {
            case 'left':
                box.x -= this.cursorSize
                box.width = this.cursorSize
                break
            case 'right':
                box.x += box.width
                box.width = this.cursorSize
                break
            case 'top':
                box.y -= this.cursorSize
                box.height = this.cursorSize
                break
            case 'bottom':
                box.y += box.height
                box.height = this.cursorSize
                break
        }

        // create the actual cursor element and append it to the container
        const cursor = Html.createElement('div', div => {
            div.class(dropCursorClass)
            div.css({
                left: `${box.x}px`,
                top: `${box.y}px`,
                width: `${box.width}px`,
                height: `${box.height}px`,
                position: 'absolute',
                zIndex: '1000'
            })
        })
        this.elem.append(cursor)
    }
}


/**
 * Once a drag operation has begun, the DragHandler listens to all mouse events to perform the drag interaction.
 */
export class DragHandler {

    anchor!: Vec
    onMouseMove!: (evt: MouseEvent) => void
    onMouseUp!: (evt: MouseEvent) => void

    fromChildren: HTMLElement[] = []
    dropZones: DropZone[] = []
    dropTarget?: DropTarget
    targetBox: Box = {x: 0, y: 0, width: 0, height: 0}

    constructor(readonly plugin: SortablePlugin, readonly container: HTMLElement, readonly fromZone: HTMLElement, readonly dragTarget: HTMLElement, evt: MouseEvent) {
        this.anchor = {
            x: evt.clientX,
            y: evt.clientY
        }

        // add a body class so that the client can change styling for the whole page while dragging
        document.querySelector('body')?.classList.add(bodyDraggingClass)

        // highlight the target itself
        this.dragTarget.classList.add(dragHighlightClass)

        // store the original sort order
        this.fromChildren = [...this.fromZone.querySelectorAll(`.${this.plugin.targetClass}`).values()] as HTMLElement[]

        // find all possible drop zones
        this.container.querySelectorAll(`.${plugin.zoneClass}`).forEach(zoneElem => {
            const zone = new DropZone(this, zoneElem as HTMLElement)
            this.dropZones.push(zone)
        })


        // capture all mouse move events while this interaction is happening
        this.onMouseMove = (evt: MouseEvent) => {
            const p = {x: evt.x, y: evt.clientY}
            const diff = Vecs.subtract(p, this.anchor)
            dragTarget.style.transform = `translate(${diff.x}px,${diff.y}px)`
            this.findDropZone(diff)
        }

        this.onMouseUp = (evt: MouseEvent) => {
            log.debug(`Drag mouse up`, evt)
            if (this.dropTarget) {
                this.performDrop(this.dropTarget)
            }
            this.dispose()
        }

        window.addEventListener('mousemove', this.onMouseMove)
        window.addEventListener('mouseup', this.onMouseUp)

        // store the bounding box of each possible target
        this.targetBox = this.dragTarget.getBoundingClientRect()
        log.debug(`Starting DragHandler for .${plugin.targetClass} target with ${this.dropZones.length} drop zones`, fromZone, dragTarget, evt)
    }

    clearCursors() {
        for (const dropZone of this.dropZones) {
            dropZone.clearCursor()
        }
    }

    findDropZone(diff: Vec) {
        this.clearCursors()

        const diffedBox = Boxes.add(this.targetBox, diff)
        for (const dropZone of this.dropZones) {
            const dropTarget = dropZone.findDropTarget(diffedBox)
            if (dropTarget) {
                this.dropTarget = dropTarget
                return
            }
        }
    }


    performDrop(dropTarget: DropTarget) {
        log.debug(`Moving drag target ${dropTarget.insertRelative} drop target ${dropTarget.index}`)
        if (dropTarget.insertRelative == 'before') {
            // move the drag target to before the drop target
            dropTarget.elem.before(this.dragTarget)
        }
        else {
            // move the drag target to after the drop target
            dropTarget.elem.after(this.dragTarget)
        }

        // notify the plugin callback
        const toChildren = [...dropTarget.zone.elem.querySelectorAll(`.${this.plugin.targetClass}`).values()] as HTMLElement[]
        this.plugin.onSorted({fromZone: this.fromZone, toZone: dropTarget.zone.elem, fromChildren: this.fromChildren, toChildren, target: this.dragTarget})
    }

    /**
     * Clear all event handlers, resets the style on the target, and ensure the cursor is removed.
     */
    dispose() {
        this.dragTarget.style.transform = ''
        this.dragTarget.classList.remove(dragHighlightClass)
        document.querySelector('body')?.classList.remove(bodyDraggingClass)
        for (const dropZone of this.dropZones) {
            dropZone.dispose()
        }
        window.removeEventListener('mousemove', this.onMouseMove)
        window.removeEventListener('mouseup', this.onMouseUp)
    }
}