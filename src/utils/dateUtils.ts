/**
 * Date utility functions
 */

/**
 * Sets the time of a date to the start of the day (00:00:00.000)
 */
export function startOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
}

/**
 * Sets the time of a date to the end of the day (23:59:59.999)
 */
export function endOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
}
