import {Part, PartTag} from "tuff-core/parts"
import {HtmlParentTag} from "tuff-core/html"
import SortableCollectionPlugin from "../src/sortable-collection-plugin"
import {Logger} from "tuff-core/logging"

const log = new Logger("Sortable Table")

export default class SortableTableElement extends Part<{}> {
    async init() {
        this.assignCollection('sortable-table-collection', TableRowCollectionElement, [
            { strings: [ 'dog', 'cat', 'mouse', 'rat'] },
            { strings: [ 'tree', 'flower', 'grass', 'leaf' ] },
            { strings: [ 'chair', 'couch', 'bed', 'table' ] },
            { strings: [ 'house', 'office', 'store', 'gym' ] },
        ])

        this.makePlugin(SortableCollectionPlugin<TableRowCollectionElement>, {
            collectionName: 'sortable-table-collection',
            onSorted: (plugin, evt) => {
                log.info(`Sorted collection`, plugin, evt)
            }
        })
    }

    render(parent: PartTag) {
        parent.h2().text('Sortable Table')
        parent.table('.sortable-table', table => {
            table.thead('', thead => {
                thead.tr('', row => {
                    for (const str of ['A', 'B', 'C', 'D']) {
                        row.th('', { text: str })
                    }
                })
            })
            table.tbody('', tbody => {
                this.renderCollection(tbody, 'sortable-table-collection', 'tbody')
            })
        })

    }
}

class TableRowCollectionElement extends Part<{ strings: string[] }> {
    get renderAsElement(): keyof HTMLElementTagNameMap & keyof HtmlParentTag {
        return "tr"
    }
    render(parent: PartTag) {
        for (const str of this.state.strings) {
            parent.td('', { text: str })
        }
    }
}