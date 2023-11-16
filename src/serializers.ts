import type { Equal } from './typeUtils';

export interface Serializer<MsgIn, MsgOut, DeserializedMsgIn = unknown, SerializedMsgOut = unknown> {
    deserialize?: (message: MsgIn) => DeserializedMsgIn;
    serialize?: (input: MsgOut) => SerializedMsgOut;
}

type DefaultWithSerializerInstance<T extends Serializer<any, any>, DefaultMsgIn, DefaultMsgOut> = T extends Serializer<
    infer MsgIn,
    infer MsgOut,
    infer DeserializedMsgIn,
    infer SerializedMsgOut
>
    ? Equal<MsgIn, unknown> extends true
        ? Equal<MsgOut, unknown> extends true
            ? Serializer<DefaultMsgIn, DefaultMsgOut, DeserializedMsgIn, SerializedMsgOut>
            : Serializer<DefaultMsgIn, MsgOut, DeserializedMsgIn, SerializedMsgOut>
        : Equal<MsgOut, unknown> extends true
          ? Serializer<DefaultMsgIn, DefaultMsgOut, DeserializedMsgIn, SerializedMsgOut>
          : Serializer<MsgIn, MsgOut, DeserializedMsgIn, SerializedMsgOut>
    : never;

type DefaultSerializer<T extends Serializer<any, any, any, any>> = T extends Serializer<
    infer MsgIn,
    infer MsgOut,
    infer DeserializedMsgIn,
    infer SerializedMsgOut
>
    ? Equal<DeserializedMsgIn, unknown> extends true
        ? // default to set MsgOut
          Equal<SerializedMsgOut, unknown> extends true
            ? // default ro set MsgIn
              Serializer<MsgIn, MsgOut, MsgIn, MsgOut>
            : Serializer<MsgIn, MsgOut, MsgIn, SerializedMsgOut>
        : Equal<SerializedMsgOut, unknown> extends true
          ? Serializer<MsgIn, MsgOut, DeserializedMsgIn, MsgOut>
          : Serializer<MsgIn, MsgOut, DeserializedMsgIn, SerializedMsgOut>
    : never;

export type WithDefault<S extends Serializer<any, any>, MsgIn, MsgOut> = DefaultSerializer<
    DefaultWithSerializerInstance<S, MsgIn, MsgOut>
>;
