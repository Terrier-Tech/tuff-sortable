import {NoState, Part, PartTag} from "tuff-core/parts"
import './style.css'
import SortablePlugin from "../src/sortable-plugin.ts"
import {Logger} from "tuff-core/logging.ts"

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

const RowContainer: ContainerDef = {
    title: "Row",
    style: {flexDirection: 'row'},
    blocks: []
}

const rowBases = ['80px', '40%', 'auto', '20%', '160px'] as const

for (let i=0; i< numBlocks; i++) {
    const basis = rowBases[i % rowBases.length]
    RowContainer.blocks.push({
        label: `Block ${i}`,
        style: {flexBasis: basis}
    })
}


// Column

const ColumnContainer: ContainerDef = {
    title: "Column",
    style: {flexDirection: 'column'},
    blocks: []
}

for (let i = 0; i < numBlocks; i++) {
    ColumnContainer.blocks.push({
        label: `Block ${i}`,
        style: {flexBasis: 'auto'}
    })
}


////////////////////////////////////////////////////////////////////////////////
// App Part
////////////////////////////////////////////////////////////////////////////////


export default class App extends Part<NoState> {

    async init() {
        this.makePlugin(SortablePlugin, {
            containerClass: 'flex-container',
            targetClass: 'block',
            onSorted: (plugin, container, children) => {
                log.info(`Sorted children`, plugin, container, children)
            }
        })

        this.dirty()
    }

    render(parent: PartTag): any {
        parent.h1().text("Tuff Sortable")
        this.renderContainer(parent, RowContainer)
        this.renderContainer(parent, ColumnContainer)
    }

    renderContainer(parent: PartTag, containerDef: ContainerDef) {
        parent.h2().text(containerDef.title)
        parent.div(".flex-container", container => {
            for (const blockDef of containerDef.blocks) {
                container.div(".block", block => {
                    block.label().text(blockDef.label)
                }).css(blockDef.style)
            }
        }).css(containerDef.style)
    }

}


////////////////////////////////////////////////////////////////////////////////
// Mount the App
////////////////////////////////////////////////////////////////////////////////

Part.mount(App, 'app', {})
