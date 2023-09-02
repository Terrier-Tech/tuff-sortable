import Vecs, {Vec} from 'tuff-core/vecs.ts'
import SortablePlugin from "./sortable-plugin.ts"
import {Logger} from "tuff-core/logging.ts"
import Html from 'tuff-core/html.ts'
import Boxes, { Box } from 'tuff-core/boxes.ts'

const log = new Logger("Handlers")

type InsertDirection = 'left' | 'right' | 'top' | 'bottom'

type DropTarget = {
    elem: HTMLElement
    box: Box
    index: number
    insertDirection?: InsertDirection
    insertRelative?: 'before' | 'after'
}

type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse'

const dragHighlightClass = 'tuff-sortable-dragging'
const dropCursorClass = 'tuff-sortable-drop-cursor'
const cursorSize = 16

/**
 * Once a drag operation has begun, the DragHandler listens to all mouse events to perform the drag interaction.
 */
export class DragHandler {

    anchor!: Vec
    onMouseMove!: (evt: MouseEvent) => void
    onMouseUp!: (evt: MouseEvent) => void

    possibleDropTargets: DropTarget[] = []
    dropTarget?: DropTarget
    targetBox: Box = {x: 0, y: 0, width: 0, height: 0}

    flexDirection!: FlexDirection
    dragIndex!: number

    constructor(readonly plugin: SortablePlugin, readonly container: HTMLElement, readonly dragTarget: HTMLElement, evt: MouseEvent) {
        this.anchor = {
            x: evt.clientX,
            y: evt.clientY
        }

        this.dragTarget.classList.add(dragHighlightClass)

        // ensure the container is flex and get its flex direction
        const computedStyle = container.computedStyleMap()
        if (computedStyle.get('display') !=  'flex') {
            throw `Sortable containers must be display: flex, not ${computedStyle.get('display')}`
        }
        this.flexDirection = computedStyle.get('flex-direction')?.toString() as FlexDirection

        log.info(`Starting DragHandler for ${this.flexDirection} container at ${this.anchor.x},${this.anchor.y}`, container, dragTarget, evt)

        // capture all mouse move events while this interaction is happening
        this.onMouseMove = (evt: MouseEvent) => {
            const p = {x: evt.x, y: evt.clientY}
            const diff = Vecs.subtract(p, this.anchor)
            dragTarget.style.transform = `translate(${diff.x}px,${diff.y}px)`
            this.findDropTarget(diff)
        }

        this.onMouseUp = (evt: MouseEvent) => {
            log.info(`Drag mouse up`, evt)
            if (this.dropTarget) {
                this.performDrop(this.dropTarget)
            }
            this.dispose()
        }

        window.addEventListener('mousemove', this.onMouseMove)
        window.addEventListener('mouseup', this.onMouseUp)

        // store the bounding box of each possible target
        this.targetBox = this.dragTarget.getBoundingClientRect()
        container.querySelectorAll(`.${plugin.targetClass}`).forEach((elem, index) => {
            if (elem instanceof HTMLElement) {
                const box = elem.getBoundingClientRect()
                this.possibleDropTargets.push({elem, box: box, index})
                if (elem == dragTarget) {
                    this.dragIndex = index
                }
            }
        })

    }

    /**
     * Find the closest drop target for the given translation of the drag target.
     * @param diff
     */
    findDropTarget(diff: Vec) {
        let minDistance = 9999999
        this.dropTarget = undefined
        const diffedBox = Boxes.add(this.targetBox, diff)

        for (const child of this.possibleDropTargets) {
            // move the box so that it can be compared directly to the target box
            const distance = Boxes.distance(child.box, diffedBox)
            if (distance < minDistance) {
                minDistance = distance
                this.dropTarget = child
            }
        }

        this.clearCursor()

        if (this.dropTarget) { // this should always be true
            if (this.dropTarget.elem == this.dragTarget) {
                log.info("The target is the closest, nothing to change")
            }
            else {
                this.computeInsert(this.dropTarget, diffedBox)
                log.info(`Insert at ${this.dropTarget.insertDirection} (index ${this.dropTarget.insertRelative})`)
            }
        }
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
                }
                else { // row
                    dropTarget.insertRelative = 'after'
                }
            }
            else { // it's to the left
                dropTarget.insertDirection = 'left'
                if (this.flexDirection == 'row-reverse') {
                    dropTarget.insertRelative = 'after'
                } else { // row
                    dropTarget.insertRelative = 'before'
                }
            }
        }
        else { //column
            if (diffedCenter.y >= dropCenter.y) { // it's below
                dropTarget.insertDirection = 'bottom'
                if (this.flexDirection == 'column-reverse') {
                    dropTarget.insertRelative = 'before'
                } else { // column
                    dropTarget.insertRelative = 'after'
                }
            }
            else { // it's above
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
     * Remove the cursor from the DOM.
     */
    clearCursor() {
        this.container.querySelector(`.${dropCursorClass}`)?.remove()
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
                box.x -= cursorSize
                box.width = cursorSize
                break
            case 'right':
                box.x += box.width
                box.width = cursorSize
                break
            case 'top':
                box.y -= cursorSize
                box.height = cursorSize
                break
            case 'bottom':
                box.y += box.height
                box.height = cursorSize
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
        this.container.append(cursor)
    }

    performDrop(dropTarget: DropTarget) {
        log.info(`Moving drag target ${dropTarget.insertRelative} drop target ${dropTarget.index}`)
        if (dropTarget.insertRelative == 'before') {
            // move the drag target to before the drop target
            dropTarget.elem.before(this.dragTarget)
        }
        else {
            // move the drag target to after the drop target
            dropTarget.elem.after(this.dragTarget)
        }
    }

    /**
     * Clear all event handlers, resets the style on the target, and ensure the cursor is removed.
     */
    dispose() {
        this.dragTarget.style.transform = ''
        this.dragTarget.classList.remove(dragHighlightClass)
        this.clearCursor()
        window.removeEventListener('mousemove', this.onMouseMove)
        window.removeEventListener('mouseup', this.onMouseUp)
    }
}