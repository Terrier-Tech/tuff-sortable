// TODO: move to tuff-core

////////////////////////////////////////////////////////////////////////////////
// Querying
////////////////////////////////////////////////////////////////////////////////

/**
 * Crawls the DOM tree upward and returns the element (if `includeSelf` is `true`) or its first ancestor that has the given class.
 * @param elem
 * @param ancestorClass
 * @param includeSelf whether to include `elem` in the search
 */
function queryAncestorClass(elem: HTMLElement, ancestorClass: string, includeSelf: boolean = true): HTMLElement | null {
    if (includeSelf && elem.classList.contains(ancestorClass)) {
        return elem
    }
    let parent = elem.parentElement
    while (parent) {
        if (parent.classList.contains(ancestorClass)) {
            return parent
        }
        parent = parent.parentElement
    }
    return null
}


////////////////////////////////////////////////////////////////////////////////
// Export
////////////////////////////////////////////////////////////////////////////////

const Dom = {
    queryAncestorClass
}

export default Dom