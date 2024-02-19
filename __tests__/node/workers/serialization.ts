import { expose, Class } from '../../../src/envs/node/worker';
import { mergeTuple } from '../../../src/shared/typeUtils';
import { Foo, Bar, Car } from '../../lib/serialization';

const exposed = {
    serialization: Class.expose({
        Foo,
        Bar: Class.define(Bar, {
            construct: {
                deserialize(message) {
                    return mergeTuple(message, [Class.fromMasterInstance(message[0])] as const);
                },
            },
            instance: {
                getFoo: {
                    serialize(input) {
                        return Class.createPointer(Foo, input);
                    },
                },
                getCar: {
                    serialize(input) {
                        if (input === undefined) {
                            return input;
                        }
                        return Class.createPointer(Car, input);
                    },
                },
            },
        }),
        Car: Class.define(Car, {
            construct: {
                deserialize(message) {
                    return mergeTuple(message, [Class.fromMasterInstance(message[0])] as const);
                },
            },
            instance: {
                getBar: {
                    serialize(input) {
                        return Class.createPointer(Bar, input);
                    },
                },
            },
        }),
    }),
};
export type SerializationExposed = typeof exposed;
expose(exposed);
