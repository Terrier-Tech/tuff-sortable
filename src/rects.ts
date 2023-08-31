import {Vec} from "tuff-core/vec.ts"

export interface Rect {
    x: number
    y: number
    width: number
    height: number
}

/**
 * Add a vector to a rectangle.
 * @param r1
 * @param v
 */
function add(r1: Rect, v: Vec): Rect {
    return {
        x: r1.x + v.x,
        y: r1.y + v.y,
        width: r1.width,
        height: r1.height
    }
}

/**
 * Subtract a vector from a rectangle.
 * @param r1
 * @param v
 */
function subtract(r1: Rect, v: Vec): Rect {
    return {
        x: r1.x - v.x,
        y: r1.y - v.y,
        width: r1.width,
        height: r1.height
    }
}

/**
 * Compute the distance between two rectangles.
 * If they overlap, returns the negative ratio of r1 that is overlapped by r2.
 * @param r1
 * @param r2
 */
function distance(r1: Rect, r2: Rect): number {
    // Calculate the intersection area between the rectangles
    const overlapLeft = Math.max(r1.x, r2.x);
    const overlapRight = Math.min(r1.x + r1.width, r2.x + r2.width);
    const overlapTop = Math.max(r1.y, r2.y);
    const overlapBottom = Math.min(r1.y + r1.height, r2.y + r2.height);

    const overlapWidth = Math.max(0, overlapRight - overlapLeft);
    const overlapHeight = Math.max(0, overlapBottom - overlapTop);
    const overlapArea = overlapWidth * overlapHeight;

    // Calculate the area of r1
    const r1Area = r1.width * r1.height;

    // Calculate the fraction of r1's area covered by r2
    const fractionCovered = overlapArea / r1Area;

    // If the rectangles don't overlap, calculate the shortest distance
    if (fractionCovered === 0) {
        const r1CenterX = r1.x + r1.width / 2;
        const r1CenterY = r1.y + r1.height / 2;
        const r2CenterX = r2.x + r2.width / 2;
        const r2CenterY = r2.y + r2.height / 2;

        const deltaX = Math.abs(r1CenterX - r2CenterX) - (r1.width + r2.width) / 2;
        const deltaY = Math.abs(r1CenterY - r2CenterY) - (r1.height + r2.height) / 2;

        return Math.sqrt(deltaX ** 2 + deltaY ** 2);
    }

    // Otherwise, return the fraction
    return -fractionCovered;
}

/**
 * Computes the center of a rectangle.
 * @param rect
 */
function center(rect: Rect): Vec {
    return {
        x: rect.x + rect.width/2,
        y: rect.y + rect.height/2
    }
}


const Rects = {
    add,
    center,
    subtract,
    distance
}
export default Rects