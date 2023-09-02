# Tuff Sortable

This is a [Tuff](https://github.com/Terrier-Tech/tuff) plugin for creating sortable lists of elements.

## Installation

    npm i tuff-sortable


## Usage

`tuff-sortable` is a Tuff _plugin_, meaning it's enabled with `makePlugin()`:

```typescript
import {Part, NoState, PartTag} from "tuff-core/parts"
import SortablePlugin from "tuff-sortable/sortable-plugin"

class MyPart extends Part<NoState> {
    
    clickKey = Messages.typedKey<{index: number}>()

    async init() {
        this.makePlugin(SortablePlugin, {
            containerClass: 'container',
            targetClass: 'target',
            onSorted: (plugin, container, children) => {
                // this gets called every time a sort occurs
                console.log("Sorted!", container, children)
            }
        })
        
        this.onClick(this.clickKey, m => {
            // this only gets called if the target isn't dragged
            console.log(`Clicked ${m.data.index}`)
        })
    }

    render(parent: PartTag) {
        parent.div('.container', container => {
            Arrays.range(0, 10).forEach(i => {
                container.a('.target')
                    .emitClick(this.clickKey)
                    .text(`Target ${i}`)
            })
        })
    }

}

```

As demonstrated above, the sortable elements can still emit standard `click` events, 
which will only occur when the sorting _doesn't_ happen during the same interaction.


## Development

To publish package changes, make sure to update the version, then run:

    npm run pub

Like all Tuff libraries, packages are Typescript source-only.


## License (MIT)

&copy; 2023 <a href="https://terrier.tech">Terrier Technologies LLC</a>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.