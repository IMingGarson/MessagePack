export const UINT32_MAX = 0xffff_ffff;

export function setUint64(view: DataView, offset: number, value: number): void {
    view.setUint32(offset, value >> 32);
    view.setUint32(offset + 4, value & 0xffffffff); // mask first 32 bits
}

export function setInt64(view: DataView, offset: number, value: number): void {
    const high = Math.floor(value / 0x1_0000_0000);
    const low = value;
    view.setUint32(offset, high);
    view.setUint32(offset + 4, low);
}

export function getInt64(view: DataView, offset: number): number {
    const high = view.getInt32(offset);
    const low = view.getUint32(offset + 4);
    return high * 0x1_0000_0000 + low;
}

export function getUint64(view: DataView, offset: number): number {
    const high = view.getUint32(offset);
    const low = view.getUint32(offset + 4);
    return high * 0x1_0000_0000 + low;
}
