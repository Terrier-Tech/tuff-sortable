import {NoState, Part, PartTag} from "tuff-core/parts"
import './style.css'
import SortablePlugin from "../src/sortable-plugin.ts"
import {Logger} from "tuff-core/logging.ts"
import Messages from "tuff-core/messages.ts"

const log = new Logger("App")

////////////////////////////////////////////////////////////////////////////////
// Types
////////////////////////////////////////////////////////////////////////////////

type ContainerDef = {
    title: string
    blocks: BlockDef[]
    style: Pick<CSSStyleDeclaration, 'flexDirection'>
}

type BlockDef = {
    label: string
    style: Pick<CSSStyleDeclaration, 'flexBasis'>
}


const numBlocks = 12


////////////////////////////////////////////////////////////////////////////////
// Values
////////////////////////////////////////////////////////////////////////////////

// Row

let n = 0

const RowContainer: ContainerDef = {
    title: "Row",
    style: {flexDirection: 'row'},
    blocks: []
}

const rowBases = ['80px', '40%', 'auto', '20%', '160px'] as const

for (let i=0; i< numBlocks; i++) {
    const basis = rowBases[i % rowBases.length]
    n += 1
    RowContainer.blocks.push({
        label: `Block ${n}`,
        style: {flexBasis: basis}
    })
}


// Column

const columnContainer1: ContainerDef = {
    title: "Column",
    style: {flexDirection: 'column'},
    blocks: []
}

for (let i = 0; i < numBlocks; i++) {
    n += 1
    columnContainer1.blocks.push({
        label: `Block ${n}`,
        style: {flexBasis: 'auto'}
    })
}

const columnContainer2: ContainerDef = {
    title: "Column",
    style: {flexDirection: 'column'},
    blocks: []
}

for (let i = 0; i < numBlocks; i++) {
    n += 1
    columnContainer2.blocks.push({
        label: `Block ${n}`,
        style: {flexBasis: 'auto'}
    })
}


////////////////////////////////////////////////////////////////////////////////
// App Part
////////////////////////////////////////////////////////////////////////////////

const clickKey = Messages.typedKey<{index: number}>()

export default class App extends Part<NoState> {

    async init() {
        this.makePlugin(SortablePlugin, {
            zoneClass: 'flex-container',
            targetClass: 'block',
            onSorted: (plugin, evt) => {
                log.info(`Sorted children`, plugin, evt)
            }
        })

        this.onClick(clickKey, m => {
            log.info(`Clicked block ${m.data.index}`, m)
        })

        this.dirty()
    }

    render(parent: PartTag): any {
        parent.h1().text("Tuff Sortable")
        parent.h2().text("Row")
        this.renderContainer(parent, RowContainer)
        parent.h2().text("Columns")
        parent.div('.columns', row => {
            this.renderContainer(row, columnContainer1)
            this.renderContainer(row, columnContainer2)
        })
    }

    renderContainer(parent: PartTag, containerDef: ContainerDef) {
        parent.div(".flex-container", container => {
            containerDef.blocks.forEach((blockDef, index) => {
                container.a(".block", block => {
                    block.label().text(blockDef.label)
                }).css(blockDef.style)
                    .emitClick(clickKey, {index})
            })
        }).css(containerDef.style)
    }

}


////////////////////////////////////////////////////////////////////////////////
// Mount the App
////////////////////////////////////////////////////////////////////////////////

Part.mount(App, 'app', {})
