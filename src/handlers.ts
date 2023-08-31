import Vecs, {Vec} from 'tuff-core/vec.ts'
import SortablePlugin from "./sortable-plugin.ts"
import {Logger} from "tuff-core/logging.ts"
import Rects, {Rect} from "./rects.ts"
import Html from 'tuff-core/html.ts'

const log = new Logger("Handlers")

type InsertDirection = 'left' | 'right' | 'top' | 'bottom'

type DropTarget = {
    elem: HTMLElement
    rect: Rect
    index: number
    insertDirection?: InsertDirection
    insertIndex?: number
}

type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse'

const dragHighlightClass = 'tuff-sortable-dragging'
const dropCursorClass = 'tuff-sortable-drop-cursor'
const cursorSize = 16

export class DragHandler {

    anchor!: Vec
    onMouseMove!: (evt: MouseEvent) => void
    onMouseUp!: (evt: MouseEvent) => void

    possibleDropTargets: DropTarget[] = []
    dropTarget?: DropTarget
    targetRect: Rect = {x: 0, y: 0, width: 0, height: 0}

    flexDirection!: FlexDirection

    constructor(readonly plugin: SortablePlugin, readonly container: HTMLElement, readonly target: HTMLElement, evt: MouseEvent) {
        this.anchor = {
            x: evt.clientX,
            y: evt.clientY
        }

        this.target.classList.add(dragHighlightClass)

        // ensure the container is flex and get its flex direction
        const computedStyle = container.computedStyleMap()
        if (computedStyle.get('display') !=  'flex') {
            throw `Sortable containers must be display: flex, not ${computedStyle.get('display')}`
        }
        this.flexDirection = computedStyle.get('flex-direction')?.toString() as FlexDirection

        log.info(`Starting DragHandler for ${this.flexDirection} container at ${this.anchor.x},${this.anchor.y}`, container, target, evt)

        // capture all mouse move events while this interaction is happening
        this.onMouseMove = (evt: MouseEvent) => {
            const p = {x: evt.x, y: evt.clientY}
            const diff = Vecs.subtract(p, this.anchor)
            target.style.transform = `translate(${diff.x}px,${diff.y}px)`
            this.findDropTarget(diff)
        }

        this.onMouseUp = (evt: MouseEvent) => {
            log.info(`Drag mouse up`, evt)
            this.dispose()
        }

        window.addEventListener('mousemove', this.onMouseMove)
        window.addEventListener('mouseup', this.onMouseUp)

        // store the bounding rect of each possible target
        this.targetRect = this.target.getBoundingClientRect()
        container.querySelectorAll(`.${plugin.targetClass}`).forEach((elem, index) => {
            if (elem instanceof HTMLElement) {
                const rect = elem.getBoundingClientRect()
                this.possibleDropTargets.push({elem, rect, index})
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
        const diffedRect = Rects.add(this.targetRect, diff)

        for (const child of this.possibleDropTargets) {
            // move the rect so that it can be compared directly to the target rect
            const distance = Rects.distance(child.rect, diffedRect)
            if (distance < minDistance) {
                minDistance = distance
                this.dropTarget = child
            }
        }

        this.clearCursor()

        if (this.dropTarget) { // this should always be true
            if (this.dropTarget.elem == this.target) {
                log.info("The target is the closest, nothing to change")
            }
            else {
                this.computeInsert(this.dropTarget, diffedRect)
                log.info(`Insert at ${this.dropTarget.insertDirection} (index ${this.dropTarget.insertIndex})`)
            }
        }
    }

    /**
     * Compute the insertIndex and insertDirection for the given drop target
     * @param dropTarget
     * @param diffedRect the target's rect offset by the interaction diff
     */
    computeInsert(dropTarget: DropTarget, diffedRect: Rect) {
        const diffedCenter = Rects.center(diffedRect)
        const dropCenter = Rects.center(dropTarget.rect)
        if (this.flexDirection.includes('row')) {
            if (diffedCenter.x >= dropCenter.x) { // it's to the right
                dropTarget.insertDirection = 'right'
                if (this.flexDirection == 'row-reverse') {
                    dropTarget.insertIndex = dropTarget.index
                }
                else { // row
                    dropTarget.insertIndex = dropTarget.index + 1
                }
            }
            else { // it's to the left
                dropTarget.insertDirection = 'left'
                if (this.flexDirection == 'row-reverse') {
                    dropTarget.insertIndex = dropTarget.index + 1
                } else { // row
                    dropTarget.insertIndex = dropTarget.index
                }
            }
        }
        else { //column
            if (diffedCenter.y >= dropCenter.y) { // it's below
                dropTarget.insertDirection = 'bottom'
                if (this.flexDirection == 'column-reverse') {
                    dropTarget.insertIndex = dropTarget.index
                } else { // column
                    dropTarget.insertIndex = dropTarget.index + 1
                }
            }
            else { // it's above
                dropTarget.insertDirection = 'top'
                if (this.flexDirection == 'column-reverse') {
                    dropTarget.insertIndex = dropTarget.index + 1
                } else { // column
                    dropTarget.insertIndex = dropTarget.index
                }
            }
        }
        this.addDropCursor(dropTarget)
    }


    clearCursor() {
        this.container.querySelector(`.${dropCursorClass}`)?.remove()
    }

    addDropCursor(dropTarget: DropTarget) {
        const rect = {
            x: dropTarget.elem.offsetLeft,
            y: dropTarget.elem.offsetTop,
            width: dropTarget.elem.offsetWidth,
            height: dropTarget.elem.offsetHeight
        }
        const box = {...rect}

        switch (dropTarget.insertDirection) {
            case 'left':
                box.x -= cursorSize
                box.width = cursorSize
                break
            case 'right':
                box.x += rect.width
                box.width = cursorSize
                break
            case 'top':
                box.y -= cursorSize
                box.height = cursorSize
                break
            case 'bottom':
                box.y += rect.height
                box.height = cursorSize
                break
        }

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

    dispose() {
        this.target.style.transform = ''
        this.target.classList.remove(dragHighlightClass)
        this.clearCursor()
        window.removeEventListener('mousemove', this.onMouseMove)
        window.removeEventListener('mouseup', this.onMouseUp)
    }
}