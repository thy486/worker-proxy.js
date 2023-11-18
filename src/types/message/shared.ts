export interface IMessageRequestSignal {
    id: number;
}

export interface IMessageRequest<T = unknown> extends IMessageRequestSignal {
    data: T;
}

export enum EMessageResponseType {
    CALLBACK,
    EVENT,
}

export interface IMessageResonse {
    type: EMessageResponseType;
}
export interface IMessageCallbackResponse extends IMessageResonse, IMessageRequestSignal {
    type: EMessageResponseType.CALLBACK;
}
export interface IMessageOkResponse<T> extends IMessageCallbackResponse {
    success: true;
    data: T;
}
export interface IMessageErrResponse<T> extends IMessageCallbackResponse {
    success: false;
    error: T;
}
export interface IMessageEventResonse {
    type: EMessageResponseType.EVENT;
    ns: string;
    event: string;
    data: unknown;
}
export type IMessageCallbackCommonResponse<TData, TError> = IMessageOkResponse<TData> | IMessageErrResponse<TError>;
export type IMessageCommonResponse<TData = unknown, TError = unknown> =
    | IMessageCallbackCommonResponse<TData, TError>
    | IMessageEventResonse;
