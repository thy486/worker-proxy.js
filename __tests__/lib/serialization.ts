export class Foo<T> {
    private readonly value: T;

    constructor(value: T) {
        this.value = value;
    }

    getValue() {
        return this.value;
    }
}

export class Bar<T> {
    private readonly value;
    private car: Car<T> | undefined;

    constructor(foo: Foo<T>) {
        this.value = foo;
    }

    async getFoo() {
        return this.value;
    }

    getCar() {
        return this.car;
    }

    setCar(car: Car<T>) {
        this.car = car;
    }
}

export class Car<T> {
    private readonly value: Bar<T>;

    public constructor(bar: Bar<T>) {
        this.value = bar;
        this.value.setCar(this);
    }

    getBar() {
        return this.value;
    }
}
