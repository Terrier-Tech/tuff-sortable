import { NoState, Part, PartTag } from "tuff-core/parts"
import SortablePlugin from "../src/sortable-plugin"
import { Logger } from "tuff-core/logging"

const log = new Logger("Handles Demo")

export default class HandlesDemo extends Part<NoState> {

    names: string[] = []

    async init() {
        for (let i = 0; i < 10; i++) {
            this.names.push(`Item ${i}`)
        }

        this.makePlugin(SortablePlugin, {
            zoneClass: 'handle-drop-zone',
            targetClass: 'handle-draggable-block',
            handleClass: 'handle',
            onSorted: (plugin, evt) => {
                log.info(`Sorted children`, plugin, evt)
            }
        })
    }


    render(parent: PartTag) {
        parent.h2().text("Handles")
        parent.div('.handle-drop-zone.flex-container', zone => {
            this.names.forEach(name => {
                zone.div('.block.handle-draggable-block', block => {
                    block.div('.handle').text("&#8801;")
                    block.div('.name').text(name)
                })
            })
        })
    }
}