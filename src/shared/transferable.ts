export interface ITransferableOptions<TransferableObject, Input> {
    transfer?: <T extends Input>(input: T) => TransferableObject[];
}
