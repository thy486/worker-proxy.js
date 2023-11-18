import { PromiseOrValue } from './type';
import type { Equal } from './typeUtils';

export interface Serializer<DeSerMsgIn = never, SerMsgIn = never, DeserializedMsgOut = unknown, SerializedMsgOut = unknown> {
    deserialize?: (message: DeSerMsgIn) => PromiseOrValue<DeserializedMsgOut>;
    serialize?: (input: SerMsgIn) => PromiseOrValue<SerializedMsgOut>;
}

type DefaultWithSerializerInstance<T, DefaultMsgIn, DefaultMsgOut> = T extends Serializer<
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
    : T;

type DefaultSerializer<T> = T extends Serializer<
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
    : T;

export type WithDefault<S, MsgIn, MsgOut> = DefaultSerializer<DefaultWithSerializerInstance<S, MsgIn, MsgOut>>;
