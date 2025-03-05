export function getAttribute(elm: Element, attr: string) {
    return elm.getAttribute(attr)
}

export function getAttributes(elm: Element) {
    return elm.attributes
}

export function setAttribute(elm: Element, attr: string, val: string | boolean) {
    if (typeof val == "string") {
        elm.setAttribute(attr, val)
    } else {
        elm.setAttribute(attr, val + "")
    }
}

export function querySelector(selector: string) {
    return document.querySelector(selector)
}

export function replaceWith(elm: Element, ...replaceNode: (Node | string)[]) {
    return elm.replaceWith(...replaceNode)
}

export function createElement<T extends keyof HTMLElementTagNameMap>(
    tagName: T,
    options?: ElementCreationOptions
): HTMLElementTagNameMap[T] {
    return document.createElement<T>(tagName, options)
}