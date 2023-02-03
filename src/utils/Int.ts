export function setUint64(view: DataView, offset: number, value: number): void {
    view.setUint32(offset, value >> 32);
    view.setUint32(offset + 4, value & 0xffffffff); // mask first 32 bits
}

export function setInt64(view: DataView, offset: number, value: number): void {
    const high = Math.floor(value / 0x1_0000_0000);
    const low = value; // high bits are truncated by DataView
    view.setUint32(offset, high);
    view.setUint32(offset + 4, low);
}
