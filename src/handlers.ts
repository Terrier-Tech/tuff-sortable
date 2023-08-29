import Vecs, {Vec} from 'tuff-core/vec.ts'
import SortablePlugin from "./sortable-plugin.ts"
import {Logger} from "tuff-core/logging.ts"

const log = new Logger("Handlers")

export class DragHandler {

    anchor!: Vec
    onMouseMove!: (evt: MouseEvent) => void
    onMouseUp!: (evt: MouseEvent) => void

    constructor(readonly plugin: SortablePlugin, readonly container: HTMLElement, readonly target: HTMLElement, evt: MouseEvent) {
        this.anchor = {
            x: evt.clientX,
            y: evt.clientY
        }

        log.info(`Starting DragHandler at ${this.anchor.x},${this.anchor.y}`, container, target, evt)

        // capture all mouse move events while this interaction is happening
        this.onMouseMove = (evt: MouseEvent) => {
            const p = {x: evt.x, y: evt.clientY}
            const diff = Vecs.subtract(p, this.anchor)
            log.info(`Drag by ${diff.x},${diff.y}`)
            target.style.transform = `translate(${diff.x}px,${diff.y}px)`
        }

        this.onMouseUp = (evt: MouseEvent) => {
            log.info(`Drag mouse up`, evt)
            target.style.transform = ''
            window.removeEventListener('mousemove', this.onMouseMove)
            window.removeEventListener('mouseup', this.onMouseUp)
        }

        window.addEventListener('mousemove', this.onMouseMove)
        window.addEventListener('mouseup', this.onMouseUp)
    }
}