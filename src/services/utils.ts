// Helper to convert database date strings to Dates in nested objects
export const _convertTimestamps = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // If it's a string that looks like a date, we could convert it, 
    // but usually we do it explicitly in the mapper.
    // For now, let's just handle arrays and objects recursively.

    if (Array.isArray(obj)) {
        return obj.map(_convertTimestamps);
    }

    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        newObj[key] = _convertTimestamps(obj[key]);
    }
    return newObj;
};
