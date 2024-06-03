import Arrays from 'tuff-core/arrays'
import Boxes, { Box } from 'tuff-core/boxes'
import Html from 'tuff-core/html'
import { Logger } from "tuff-core/logging"
import Vecs, { Vec } from 'tuff-core/vecs'

const log = new Logger("Handlers")

type InsertDirection = 'left' | 'right' | 'top' | 'bottom'

export type DropTarget = {
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
    possibleDropTargets: DropTarget[]
    zoneBox!: Box

    constructor(
        readonly handler: DragHandler,
        readonly elem: HTMLElement,
        possibleTargetElems: HTMLElement[]
    ) {
        this.zoneBox = elem.getBoundingClientRect()
        elem.classList.add(possibleDropZoneClass)

        // ensure the element is flex and get its flex direction
        if ('computedStyleMap' in elem) {
            const computedStyle = (elem as any).computedStyleMap() as any // don't know why we can't use StylePropertyMapReadOnly
            if (computedStyle.get('display')?.toString() != 'flex') {
                if (elem instanceof HTMLTableSectionElement) {
                    this.flexDirection = "column"
                } else {
                    throw `Sortable containers must be display: flex, not ${computedStyle.get('display')} Otherwise, containers must be a table body.`
                }
            } else {
                this.flexDirection = computedStyle.get('flex-direction')?.toString() as FlexDirection
            }
        }
        else {
            log.warn(`Browser does not support computedStyleMap, assuming flex-direction=row`)
            this.flexDirection = 'row'
        }

        this.possibleDropTargets = possibleTargetElems.map((elem, index) => {
            const box = elem.getBoundingClientRect()
            return {zone: this, elem, box: box, index}
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
        if (this.elem instanceof HTMLTableSectionElement) {
            this.addTableDropCursor(dropTarget)
        } else {
            this.addDropCursor(dropTarget)
        }
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

    addTableDropCursor(dropTarget: DropTarget) {
        const numberOfColumns = this.elem.firstElementChild?.children.length

        const cursor = document.createElement('div')
        cursor.classList.add(dropCursorClass)

        cursor.style.height = '5px'
        cursor.style.zIndex = '1000'
        cursor.style.position = 'absolute'
        cursor.style.width = '100%'

        switch (dropTarget.insertDirection) {
            case 'top':
                this.elem.insertBefore(cursor, dropTarget.elem)
                break
            case 'bottom':
                this.elem.insertBefore(cursor, dropTarget.elem.nextSibling)
                break
        }

        if (numberOfColumns) {
            for (let i = 0; i < numberOfColumns; i++) {
                const td = document.createElement('td')
                cursor.append(td)
            }
        }
    }
}


/**
 * Once a drag operation has begun, the DragHandler listens to all mouse events to perform the drag interaction.
 */
export class DragHandler {

    anchor!: Vec
    onMouseMove!: (evt: MouseEvent) => void
    onMouseUp!: (evt: MouseEvent) => void
    onScroll!: (evt: Event) => void

    dropZones: DropZone[] = []
    dropTarget?: DropTarget
    targetBox: Box = {x: 0, y: 0, width: 0, height: 0}

    constructor(
        readonly dragTarget: HTMLElement,
        toZones: Map<HTMLElement, HTMLElement[]>,
        readonly onDrop: (dropTarget: DropTarget, dragTarget: HTMLElement) => void,
        evt: MouseEvent
    ) {
        this.anchor = {
            x: evt.pageX,
            y: evt.pageY
        }

        // add a body class so that the client can change styling for the whole page while dragging
        document.querySelector('body')?.classList.add(bodyDraggingClass)

        // highlight the target itself
        this.dragTarget.classList.add(dragHighlightClass)

        this.dropZones = Array.from(toZones, ([zoneElem, targetElems]) => {
            return new DropZone(this, zoneElem, targetElems)
        })

        // capture all mouse move events while this interaction is happening
        let lastPoint = { x: evt.pageX, y: evt.pageY }
        let lastScrollPos  = { x: window.scrollX, y: window.scrollY }
        this.onMouseMove = (evt: MouseEvent) => {
            lastPoint = {x: evt.pageX, y: evt.pageY}
            lastScrollPos = { x: window.scrollX, y: window.scrollY }
            const diff = Vecs.subtract(lastPoint, this.anchor)
            dragTarget.style.transform = `translate(${diff.x}px,${diff.y}px)`
            this.findDropZone(diff)
        }

        this.onScroll = (_: Event) => {
            const scrollDiff = { x: window.scrollX - lastScrollPos.x, y: window.scrollY - lastScrollPos.y }
            const p = { x: lastPoint.x + scrollDiff.x, y: lastPoint.y + scrollDiff.y }
            const diff = Vecs.subtract(p, this.anchor)
            dragTarget.style.transform = `translate(${diff.x}px,${diff.y}px)`
            this.findDropZone(diff)
        }

        this.onMouseUp = (evt: MouseEvent) => {
            log.debug(`Drag mouse up`, evt)
            try {
                if (this.dropTarget) {
                    this.performDrop(this.dropTarget)
                }
            } finally {
                this.dispose()
            }
        }

        window.addEventListener('mousemove', this.onMouseMove)
        window.addEventListener('mouseup', this.onMouseUp)
        window.addEventListener('scroll', this.onScroll)

        // store the bounding box of each possible target
        this.targetBox = this.dragTarget.getBoundingClientRect()
        log.debug(`Starting DragHandler for .${Array.from(dragTarget.classList).join('.')} target with ${this.dropZones.length} drop zones`, dragTarget, evt)
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
        this.onDrop(dropTarget, this.dragTarget)
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
        this.dropZones = []
        window.removeEventListener('mousemove', this.onMouseMove)
        window.removeEventListener('mouseup', this.onMouseUp)
        window.removeEventListener('scroll', this.onScroll)
    }
}