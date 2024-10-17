import {NoState, Part, PartTag} from "tuff-core/parts"
import './style.css'
import SortableCollectionPlugin from "../src/sortable-collection-plugin"
import SortablePlugin from "../src/sortable-plugin"
import {Logger} from "tuff-core/logging"
import Messages from "tuff-core/messages"
import SortableTableElement from "./sortable_table_element"
import HandlesDemo from "./handles-demo"

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

    _handlesPart!: HandlesDemo

    _tablePart!: SortableTableElement
    
    async init() {
        this.makePlugin(SortablePlugin, {
            zoneClass: 'drop-zone',
            targetClass: 'draggable-block',
            onSorted: (plugin, evt) => {
                log.info(`Sorted children`, plugin, evt)
            }
        })

        this.makePlugin(SortableCollectionPlugin<CollectionElement>, {
            collectionName: 'sortable-collection',
            onSorted: (plugin, evt) => {
                log.info(`Sorted collection`, plugin, evt)
            }
        })

        this.assignCollection('sortable-collection', CollectionElement, [
            { str: "alpha" },
            { str: "bravo" },
            { str: "charlie" },
            { str: "delta" },
        ])

        this._handlesPart = this.makePart(HandlesDemo, {})

        this._tablePart = this.makePart(SortableTableElement, {})

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
        parent.h2().text("Collections")
        this.renderCollection(parent, 'sortable-collection')
            .class('flex-container')
            .css({ flexDirection: 'column' })
        parent.part(this._tablePart)

        parent.part(this._handlesPart)
    }

    renderContainer(parent: PartTag, containerDef: ContainerDef) {
        parent.div(".flex-container.drop-zone", container => {
            containerDef.blocks.forEach((blockDef, index) => {
                container.a(".block.draggable-block", block => {
                    const rand = Math.random()
                    if (rand > 0.75) {
                        block.select(select => {
                            select.option({value: blockDef.label, selected: true}).text(blockDef.label)
                        })
                    }
                    else if (rand < 0.25) {
                        block.input({type: 'text', value: blockDef.label})
                    }
                    else {
                        block.label().text(blockDef.label)
                    }
                }).css(blockDef.style)
                    .emitClick(clickKey, {index})
            })
        }).css(containerDef.style)
    }

}

class CollectionElement extends Part<{ str: string }> {

    get parentClasses(): Array<string> {
        return ['block', ...super.parentClasses]
    }

    render(parent: PartTag) {
        parent.div('.spread-content', row => {
            row.label().text(this.id)
            row.label().text(this.state.str)
        })
    }
}


////////////////////////////////////////////////////////////////////////////////
// Mount the App
////////////////////////////////////////////////////////////////////////////////

Part.mount(App, 'app', {})
