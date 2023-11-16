export interface TransferableOptions<TransferableObject, Input> {
    transfer?: <T extends Input>(input: T) => TransferableObject[];
}
