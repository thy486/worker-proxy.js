import { expose, Class } from '../../../src/envs/node/worker';
import { Foo, Bar, Car } from '../../lib/serialization';

const exposed = {
    serialization: Class.expose({ 
        Foo,
        Bar: Class.define(Bar, {
            instance: {
                getFoo: {
                    serialize(input) {
                        return Class.pointerify(Foo, input);
                    },
                },
                getCar: {
                    serialize(input) {
                        if (input === undefined) {
                            return input;
                        }
                        return Class.pointerify(Car, input);
                    },
                }
            }
        }),
        Car: Class.define(Car, {
            instance: {
                getBar: {
                    serialize(input) {
                        return Class.pointerify(Bar, input);
                    },
                }
            }
        })
    }),
};
export type SerializationExposed = typeof exposed;
expose(exposed);
